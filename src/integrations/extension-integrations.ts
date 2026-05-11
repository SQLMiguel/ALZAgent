/**
 * Detect and proxy to companion VS Code extensions (Tier 1):
 *   - GitHub Copilot Chat       (hard dependency)
 *   - Bicep                     (build / lint / visualizer)
 *   - Azure MCP Server          (tool calls; surfaced via vscode.lm.tools)
 *   - Azure Resources           (sign-in / subscription picker)
 *   - Azure CLI Tools           (no programmatic surface; presence only)
 *
 * Each helper degrades gracefully when the underlying extension is absent.
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const EXTENSION_IDS = {
  copilotChat: 'GitHub.copilot-chat',
  bicep: 'ms-azuretools.vscode-bicep',
  azureMcp: 'ms-azuretools.vscode-azure-mcp-server',
  azureResources: 'ms-azuretools.vscode-azureresourcegroups',
  azureCli: 'ms-vscode.azurecli',
} as const;

export interface ExtensionStatus {
  id: string;
  name: string;
  installed: boolean;
  active: boolean;
}

export interface AzureCliContext {
  loggedIn: boolean;
  subscriptionId?: string;
  subscriptionName?: string;
  user?: string;
  tenantId?: string;
  error?: string;
}

export interface BicepBuildOutcome {
  ok: boolean;
  /** 'extension' | 'cli' | 'none' */
  via: 'extension' | 'cli' | 'none';
  message: string;
}

export interface DeploymentOutcome {
  ok: boolean;
  output: string;
  error?: string;
}

export class ExtensionIntegrations {
  /** Snapshot the install/active state of every Tier 1 companion. */
  static getStatus(): ExtensionStatus[] {
    const items: Array<[string, string]> = [
      [EXTENSION_IDS.copilotChat, 'GitHub Copilot Chat'],
      [EXTENSION_IDS.bicep, 'Bicep'],
      [EXTENSION_IDS.azureMcp, 'Azure MCP Server'],
      [EXTENSION_IDS.azureResources, 'Azure Resources'],
      [EXTENSION_IDS.azureCli, 'Azure CLI Tools'],
    ];
    return items.map(([id, name]) => {
      const ext = vscode.extensions.getExtension(id);
      return {
        id,
        name,
        installed: ext !== undefined,
        active: ext?.isActive ?? false,
      };
    });
  }

  /** True iff the Bicep extension is installed (regardless of activation). */
  static hasBicepExtension(): boolean {
    return vscode.extensions.getExtension(EXTENSION_IDS.bicep) !== undefined;
  }

  /**
   * Build a .bicep file using, in priority order:
   *   1. The Bicep extension's `bicep.build` command (in-process, fastest).
   *   2. The Azure CLI: `az bicep build --file <path> --stdout`.
   *   3. None (returns ok=true with a warning so we don't block validation).
   */
  static async buildBicep(filePath: string): Promise<BicepBuildOutcome> {
    if (this.hasBicepExtension()) {
      try {
        // The extension activates lazily; ensure it's loaded.
        await vscode.extensions
          .getExtension(EXTENSION_IDS.bicep)
          ?.activate();
        await vscode.commands.executeCommand(
          'bicep.build',
          vscode.Uri.file(filePath)
        );
        return { ok: true, via: 'extension', message: 'Built via Bicep extension.' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Fall through to CLI - extension may not register the command in
        // headless test contexts.
        if (!/command 'bicep\.build' not found/i.test(msg)) {
          return { ok: false, via: 'extension', message: msg };
        }
      }
    }

    try {
      await execAsync(`az bicep build --file "${filePath}" --stdout`, {
        timeout: 30000,
      });
      return { ok: true, via: 'cli', message: 'Built via Azure CLI.' };
    } catch (err) {
      const e = err as { stderr?: string; message?: string };
      const stderr = e.stderr ?? e.message ?? 'unknown bicep error';
      if (/'az' is not recognized|command not found/i.test(stderr)) {
        return {
          ok: true,
          via: 'none',
          message:
            'Neither the Bicep extension nor Azure CLI are available; ' +
            'syntax check skipped.',
        };
      }
      return { ok: false, via: 'cli', message: stderr.split('\n').slice(0, 3).join(' ') };
    }
  }

  /** Open a .bicep file in the Bicep visualizer (if the extension is present). */
  static async showBicepVisualizer(filePath: string): Promise<boolean> {
    if (!this.hasBicepExtension()) {
      return false;
    }
    try {
      await vscode.extensions.getExtension(EXTENSION_IDS.bicep)?.activate();
      await vscode.commands.executeCommand(
        'bicep.showVisualizer',
        vscode.Uri.file(filePath)
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Best-effort Azure CLI login context. We deliberately use the CLI rather
   * than the Azure Resources extension's API because the latter has changed
   * shape across versions; the CLI surface is stable and required for
   * deployment anyway.
   */
  static async getAzureContext(): Promise<AzureCliContext> {
    try {
      const { stdout } = await execAsync('az account show -o json', { timeout: 10000 });
      const acct = JSON.parse(stdout) as {
        id?: string;
        name?: string;
        tenantId?: string;
        user?: { name?: string };
      };
      return {
        loggedIn: true,
        subscriptionId: acct.id,
        subscriptionName: acct.name,
        tenantId: acct.tenantId,
        user: acct.user?.name,
      };
    } catch (err) {
      const e = err as { stderr?: string; message?: string };
      const message = e.stderr ?? e.message ?? '';
      if (/'az' is not recognized|command not found/i.test(message)) {
        return { loggedIn: false, error: 'Azure CLI (az) is not on PATH.' };
      }
      return {
        loggedIn: false,
        error: 'Not signed in. Run `az login` in a terminal.',
      };
    }
  }

  /**
   * Deploy a Bicep file at subscription scope (the standard ALZ deployment
   * scope). Caller must have already confirmed sign-in via getAzureContext().
   */
  static async deployBicepSubscription(
    filePath: string,
    location: string,
    parameters: Record<string, string> = {},
    deploymentName?: string
  ): Promise<DeploymentOutcome> {
    const name =
      deploymentName ??
      `alz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const paramArgs = Object.entries(parameters)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    const paramFlag = paramArgs.length > 0 ? `--parameters ${paramArgs}` : '';
    const cmd =
      `az deployment sub create --name "${name}" --location "${location}" ` +
      `--template-file "${filePath}" ${paramFlag} -o json`;
    try {
      const { stdout } = await execAsync(cmd, { timeout: 30 * 60 * 1000 });
      return { ok: true, output: stdout };
    } catch (err) {
      const e = err as { stderr?: string; message?: string; stdout?: string };
      return {
        ok: false,
        output: e.stdout ?? '',
        error: (e.stderr ?? e.message ?? 'unknown deployment error')
          .split('\n')
          .slice(0, 6)
          .join('\n'),
      };
    }
  }
}

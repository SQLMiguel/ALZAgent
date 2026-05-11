import * as vscode from 'vscode';
import { ALZAgentHandler } from './agent/handler';

/**
 * Extension entry point - activated when VS Code loads the extension
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('[ALZ Agent] Extension activated');

  const handler = new ALZAgentHandler(context);

  // Register the chat participant (@alz)
  const participant = vscode.chat.createChatParticipant(
    'alz-agent.alz',
    async (request, chatContext, stream, token) => {
      await handler.handleRequest(request, chatContext, stream, token);
    }
  );

  participant.iconPath = new vscode.ThemeIcon('cloud');

  // Register commands
  context.subscriptions.push(
    participant,
    vscode.commands.registerCommand('alz-agent.startDesign', () => {
      vscode.commands.executeCommand('workbench.action.chat.open', { query: '@alz /design' });
    }),
    vscode.commands.registerCommand('alz-agent.validateArchitecture', () => {
      vscode.commands.executeCommand('workbench.action.chat.open', { query: '@alz /validate' });
    }),
    vscode.commands.registerCommand('alz-agent.generateBicep', () => {
      vscode.commands.executeCommand('workbench.action.chat.open', { query: '@alz /generate bicep' });
    }),
    vscode.commands.registerCommand('alz-agent.generateTerraform', () => {
      vscode.commands.executeCommand('workbench.action.chat.open', { query: '@alz /generate terraform' });
    }),
    vscode.commands.registerCommand('alz-agent.clearSession', async () => {
      await handler.clearSession();
      vscode.window.showInformationMessage('ALZ Agent session cleared');
    })
  );
}

export function deactivate(): void {
  console.log('[ALZ Agent] Extension deactivated');
}

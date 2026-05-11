/**
 * Diagram Generator
 * Uses the LLM to produce Mermaid architecture diagrams from captured
 * landing-zone requirements.
 */

import * as vscode from 'vscode';
import { LlmService } from '../agent/llm-service';

export interface Diagram {
  name: string;
  title: string;
  mermaidCode: string;
}

interface DiagramSpec {
  name: string;
  title: string;
  mermaidType: string;
  focus: string;
}

const DIAGRAMS: DiagramSpec[] = [
  {
    name: 'management-group-hierarchy',
    title: 'Management Group Hierarchy',
    mermaidType: 'flowchart TD',
    focus:
      'Enterprise-Scale aligned: Tenant Root -> top-level org MG -> Platform ' +
      '(Identity, Management, Connectivity), Landing Zones (Corp, Online, ' +
      'Confidential-* if required), Sandbox, Decommissioned. Show subscription ' +
      'placement under each MG.',
  },
  {
    name: 'network-topology',
    title: 'Network Topology',
    mermaidType: 'flowchart LR',
    focus:
      'Hub-and-spoke or Virtual WAN based on the requirements. Include hub VNet, ' +
      'Azure Firewall (or vWAN secured hub), spokes per landing-zone archetype, ' +
      'ExpressRoute / VPN gateway if hybrid, on-premises connectivity, and DNS ' +
      'private resolver if applicable.',
  },
  {
    name: 'identity-and-access',
    title: 'Identity and Access Architecture',
    mermaidType: 'flowchart TB',
    focus:
      'Microsoft Entra ID tenant, hybrid identity (Entra Connect or Cloud Sync) ' +
      'if required, PIM, conditional access, B2B / B2C if in scope, break-glass ' +
      'accounts, RBAC scope boundaries.',
  },
];

export class DiagramGenerator {
  constructor(private llm: LlmService = new LlmService()) {}

  async generate(
    requirements: unknown,
    token: vscode.CancellationToken = new vscode.CancellationTokenSource().token
  ): Promise<Diagram[]> {
    const reqJson = JSON.stringify(requirements ?? {}, null, 2);
    const out: Diagram[] = [];

    for (const spec of DIAGRAMS) {
      const systemPrompt =
        'You are a senior Azure cloud architect producing Mermaid diagrams. ' +
        'Output ONLY the Mermaid source code wrapped in a single ```mermaid ' +
        'fenced block - no commentary outside the fence.';

      const userPrompt =
        `# Diagram\n${spec.title}\n\n` +
        `# Mermaid Diagram Type\n${spec.mermaidType}\n\n` +
        `# Focus\n${spec.focus}\n\n` +
        `# Captured Requirements (JSON)\n\`\`\`json\n${reqJson}\n\`\`\`\n\n` +
        `# Constraints\n` +
        `- Start the diagram with: ${spec.mermaidType}\n` +
        `- Use clear node IDs (no spaces) and human-readable labels in brackets.\n` +
        `- Use subgraph blocks to group related nodes (e.g. subscriptions, regions).\n` +
        `- Keep total nodes under 30 for readability.\n` +
        `- Do not include any text outside the fenced block.`;

      const raw = await this.llm.complete(systemPrompt, userPrompt, token);
      const mermaid =
        raw.trim().length > 0
          ? LlmService.extractCodeBlock(raw, 'mermaid')
          : `${spec.mermaidType}\n  A[LLM unavailable]`;

      out.push({ name: spec.name, title: spec.title, mermaidCode: mermaid });
    }

    return out;
  }
}

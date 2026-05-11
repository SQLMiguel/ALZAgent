/**
 * ADR Generator
 * Uses the LLM to produce Markdown Architecture Decision Records (MADR format)
 * from captured landing-zone requirements.
 */

import * as vscode from 'vscode';
import { LlmService } from '../agent/llm-service';

export interface ADR {
  id: string;
  title: string;
  content: string;
}

/** Decisions that the agent always considers for an Azure Landing Zone. */
const DECISIONS: Array<{ id: string; title: string; focus: string }> = [
  {
    id: 'ADR-001',
    title: 'Network Topology',
    focus:
      'Choose between hub-and-spoke and Azure Virtual WAN. ' +
      'Consider scale, hybrid connectivity, transit routing, and management overhead.',
  },
  {
    id: 'ADR-002',
    title: 'Identity and Access Model',
    focus:
      'Microsoft Entra ID tenant strategy, hybrid identity (Entra Connect / Cloud Sync), ' +
      'PIM, B2B/B2C, and break-glass accounts.',
  },
  {
    id: 'ADR-003',
    title: 'Management Group Hierarchy',
    focus:
      'Enterprise-Scale aligned hierarchy: Tenant Root -> Top-Level (e.g. "Contoso") -> ' +
      'Platform (Identity, Management, Connectivity), Landing Zones (Corp, Online, ' +
      'Confidential-*), Sandbox, Decommissioned.',
  },
  {
    id: 'ADR-004',
    title: 'Subscription Strategy',
    focus:
      'Subscription per platform service vs. consolidated; landing-zone subscription ' +
      'archetypes; sandbox subscription policy; decommissioning workflow.',
  },
  {
    id: 'ADR-005',
    title: 'Security Baseline',
    focus:
      'Microsoft Defender for Cloud plans, Microsoft Sentinel, encryption (PMK vs CMK), ' +
      'Azure Policy initiatives (Azure Security Benchmark, regulatory compliance).',
  },
  {
    id: 'ADR-006',
    title: 'Logging and Monitoring',
    focus:
      'Central Log Analytics workspace topology, diagnostic settings policy, ' +
      'Azure Monitor agent rollout, retention.',
  },
  {
    id: 'ADR-007',
    title: 'Infrastructure-as-Code Strategy',
    focus:
      'Bicep vs Terraform, module sourcing (Azure Verified Modules vs CAF Terraform ' +
      'modules), pipeline platform, environment promotion model.',
  },
];

export class ADRGenerator {
  constructor(private llm: LlmService = new LlmService()) {}

  async generateFromRequirements(
    requirements: unknown,
    token: vscode.CancellationToken = new vscode.CancellationTokenSource().token
  ): Promise<ADR[]> {
    const reqJson = JSON.stringify(requirements ?? {}, null, 2);
    const adrs: ADR[] = [];

    for (const decision of DECISIONS) {
      const systemPrompt =
        'You are a senior Azure cloud architect producing Markdown Architecture ' +
        'Decision Records (ADRs) in MADR 4.0 format. Output ONLY the ADR Markdown - ' +
        'no preamble, no closing commentary, no code fences around the document.';

      const userPrompt =
        `# Decision\n${decision.title}\n\n` +
        `# Focus\n${decision.focus}\n\n` +
        `# Captured Requirements (JSON)\n\`\`\`json\n${reqJson}\n\`\`\`\n\n` +
        `# Required ADR Structure\n` +
        `Use this exact section order:\n` +
        `1. \`# ${decision.id}: <decision title>\`\n` +
        `2. \`## Status\` - "Proposed" with today's date.\n` +
        `3. \`## Context\` - 2-4 paragraphs of business + technical context derived ` +
        `from the requirements above.\n` +
        `4. \`## Decision Drivers\` - bullet list of 3-6 drivers.\n` +
        `5. \`## Considered Options\` - exactly 3 options as a numbered list.\n` +
        `6. \`## Decision Outcome\` - the chosen option, with justification (2-3 ` +
        `paragraphs) and explicit reference to the relevant CAF design area and ` +
        `Well-Architected pillar.\n` +
        `7. \`## Consequences\` - "### Positive" and "### Negative" subsections, ` +
        `bullet lists.\n` +
        `8. \`## References\` - bullet list of authoritative ` +
        `https://learn.microsoft.com or https://github.com/Azure/Enterprise-Scale links.\n\n` +
        `Be specific to the captured requirements - do not produce a generic template.`;

      const raw = await this.llm.complete(systemPrompt, userPrompt, token);
      const content = raw.trim().length > 0 ? raw.trim() : this.fallback(decision);

      adrs.push({ id: decision.id, title: decision.title, content });
    }

    return adrs;
  }

  private fallback(decision: { id: string; title: string }): string {
    return (
      `# ${decision.id}: ${decision.title}\n\n` +
      `## Status\n\nProposed - LLM generation unavailable. Edit manually.\n`
    );
  }
}

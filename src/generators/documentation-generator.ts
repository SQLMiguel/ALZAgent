/**
 * Documentation Generator
 * Produces operational artifacts (runbooks, glossary, README) for the
 * captured landing-zone design. LLM-driven so output is grounded in the
 * specific requirements rather than a static template.
 */

import * as vscode from 'vscode';
import { LlmService } from '../agent/llm-service';

export interface DocArtifact {
  /** Workspace-relative path to write the doc to. */
  path: string;
  /** Markdown content. */
  content: string;
  /** Short label for chat output. */
  label: string;
}

interface DocSpec {
  path: string;
  label: string;
  systemPrompt: string;
  userPrompt: (reqJson: string) => string;
  fallback: string;
}

const DOC_SPECS: DocSpec[] = [
  {
    path: 'docs/operations/landing-zone-overview.md',
    label: 'Landing Zone Overview',
    systemPrompt:
      'You are a senior Azure cloud architect producing operational documentation. ' +
      'Output ONLY Markdown - no preamble, no commentary, no code fences around the doc.',
    userPrompt: (reqJson) =>
      `# Captured Requirements\n\`\`\`json\n${reqJson}\n\`\`\`\n\n` +
      `# Required Document\n` +
      `Produce \`landing-zone-overview.md\` with these sections in order:\n` +
      `1. \`# Landing Zone Overview\`\n` +
      `2. \`## Purpose\` - 1 paragraph.\n` +
      `3. \`## Scope\` - subscriptions, regions, workloads in scope.\n` +
      `4. \`## Architecture Summary\` - network topology, identity model, management group ` +
      `hierarchy in 3-5 paragraphs.\n` +
      `5. \`## Key Decisions\` - bullet list referencing ADR-001..ADR-007.\n` +
      `6. \`## Roles and Responsibilities\` - Markdown table (Role | Owner | Responsibilities).\n` +
      `7. \`## Related Artifacts\` - bullet list linking ADRs, IaC modules, diagrams.\n`,
    fallback:
      '# Landing Zone Overview\n\nLLM unavailable. Populate from captured requirements manually.\n',
  },
  {
    path: 'docs/operations/runbook-deployment.md',
    label: 'Deployment Runbook',
    systemPrompt:
      'You are a senior Azure DevOps engineer producing a deployment runbook. ' +
      'Output ONLY Markdown.',
    userPrompt: (reqJson) =>
      `# Captured Requirements\n\`\`\`json\n${reqJson}\n\`\`\`\n\n` +
      `# Required Runbook\n` +
      `Produce \`runbook-deployment.md\` with these sections:\n` +
      `1. \`# Deployment Runbook\`\n` +
      `2. \`## Prerequisites\` - Azure CLI version, Bicep extension, RBAC required, ` +
      `subscription quotas.\n` +
      `3. \`## Pre-Deployment Checks\` - numbered list (sign-in, what-if, parameter review).\n` +
      `4. \`## Deployment Steps\` - numbered list with explicit \`az deployment sub create\` ` +
      `commands tailored to the captured topology.\n` +
      `5. \`## Post-Deployment Validation\` - smoke tests, policy compliance, log ingestion ` +
      `verification.\n` +
      `6. \`## Rollback Procedure\` - explicit steps to revert.\n` +
      `7. \`## Troubleshooting\` - Markdown table (Symptom | Likely Cause | Resolution) with ` +
      `at least 5 rows relevant to the topology.\n`,
    fallback:
      '# Deployment Runbook\n\nLLM unavailable. Author manually using deployment commands.\n',
  },
  {
    path: 'docs/operations/runbook-incident-response.md',
    label: 'Incident Response Runbook',
    systemPrompt:
      'You are a senior Azure SRE producing an incident-response runbook. ' +
      'Output ONLY Markdown.',
    userPrompt: (reqJson) =>
      `# Captured Requirements\n\`\`\`json\n${reqJson}\n\`\`\`\n\n` +
      `# Required Runbook\n` +
      `Produce \`runbook-incident-response.md\` with these sections:\n` +
      `1. \`# Incident Response Runbook\`\n` +
      `2. \`## Severity Definitions\` - Markdown table (Sev | Impact | Response SLA).\n` +
      `3. \`## On-Call Rotation\` - placeholder table (Week | Primary | Secondary).\n` +
      `4. \`## Detection\` - which Azure Monitor / Sentinel alerts fire and where.\n` +
      `5. \`## Common Scenarios\` - at least 5 \`### <scenario>\` subsections relevant to the ` +
      `captured topology, each with Symptoms, Diagnostic Commands (\`az\` or KQL), and ` +
      `Mitigation steps.\n` +
      `6. \`## Escalation\` - Markdown table (Issue Type | Escalate To | Channel).\n` +
      `7. \`## Post-Incident\` - blameless postmortem checklist.\n`,
    fallback:
      '# Incident Response Runbook\n\nLLM unavailable. Author manually.\n',
  },
  {
    path: 'docs/operations/glossary.md',
    label: 'Glossary',
    systemPrompt:
      'You are a technical writer producing an Azure Landing Zone glossary. ' +
      'Output ONLY Markdown.',
    userPrompt: (reqJson) =>
      `# Captured Requirements\n\`\`\`json\n${reqJson}\n\`\`\`\n\n` +
      `# Required Glossary\n` +
      `Produce \`glossary.md\` defining every Azure / ALZ term that appears in the ` +
      `requirements above plus the standard ALZ vocabulary (management group, subscription, ` +
      `landing zone, hub, spoke, vWAN, Entra ID, PIM, Defender for Cloud, Sentinel, ` +
      `Azure Policy, initiative, AVM, CAF). Format:\n\n` +
      `# Glossary\n\n` +
      `## <Term>\n<1-3 sentence definition with at least one https://learn.microsoft.com link>\n\n` +
      `Sort entries alphabetically. Aim for 20-30 entries.\n`,
    fallback:
      '# Glossary\n\nLLM unavailable. Add terms manually.\n',
  },
];

export class DocumentationGenerator {
  constructor(private llm: LlmService = new LlmService()) {}

  /**
   * Generate the full documentation set from captured requirements.
   */
  async generate(
    requirements: unknown,
    token: vscode.CancellationToken = new vscode.CancellationTokenSource().token
  ): Promise<DocArtifact[]> {
    const reqJson = JSON.stringify(requirements ?? {}, null, 2);
    const out: DocArtifact[] = [];

    for (const spec of DOC_SPECS) {
      if (token.isCancellationRequested) {
        break;
      }
      const raw = await this.llm.complete(
        spec.systemPrompt,
        spec.userPrompt(reqJson),
        token
      );
      const content = raw.trim().length > 0 ? raw.trim() : spec.fallback;
      out.push({ path: spec.path, label: spec.label, content });
    }

    return out;
  }

  /** Expose the spec list for diagnostics / tests. */
  static specs(): ReadonlyArray<{ path: string; label: string }> {
    return DOC_SPECS.map(({ path, label }) => ({ path, label }));
  }
}

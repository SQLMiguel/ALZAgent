/**
 * IaC Generator
 * Uses the LLM to produce production-ready Bicep or Terraform that scaffolds an
 * Azure Enterprise-Scale Landing Zone from captured requirements.
 */

import * as vscode from 'vscode';
import { LlmService } from '../agent/llm-service';

export interface IaCTemplate {
  filename: string;
  content: string;
}

interface ArtifactSpec {
  filename: string;
  description: string;
}

const BICEP_ARTIFACTS: ArtifactSpec[] = [
  {
    filename: 'main.bicep',
    description:
      'Subscription-scoped entry point. Uses targetScope = "subscription". Wires ' +
      'modules for management groups, policy assignments, networking, and logging. ' +
      'Parameters: location, environment, organisationName, tags. Reference Azure ' +
      'Verified Modules from br/public:avm/* where appropriate.',
  },
  {
    filename: 'modules/management-groups.bicep',
    description:
      'Module scoped to tenant (targetScope = "tenant"). Creates Enterprise-Scale ' +
      'aligned hierarchy: top-level org MG -> Platform (Identity, Management, ' +
      'Connectivity), Landing Zones (Corp, Online), Sandbox, Decommissioned.',
  },
  {
    filename: 'modules/networking-hub.bicep',
    description:
      'Hub VNet with Azure Firewall (or Virtual WAN hub if requirements indicate ' +
      'vWAN), Azure Bastion subnet, GatewaySubnet for ExpressRoute/VPN, and ' +
      'private DNS zones for common Private Link services. Use AVM modules where ' +
      'available.',
  },
  {
    filename: 'modules/logging.bicep',
    description:
      'Central Log Analytics workspace in the Management subscription with retention ' +
      'aligned to compliance requirements, plus a diagnostic-settings policy ' +
      'assignment that targets all subscriptions in the management-group hierarchy.',
  },
  {
    filename: 'parameters/dev.bicepparam',
    description:
      'Bicep parameters file (.bicepparam syntax) for the dev environment. Use ' +
      'the using \'../main.bicep\' directive and supply realistic dev values.',
  },
];

const TERRAFORM_ARTIFACTS: ArtifactSpec[] = [
  {
    filename: 'main.tf',
    description:
      'Root Terraform module. Calls Azure/caf-terraform-landingzones modules where ' +
      'appropriate, otherwise composes hashicorp/azurerm resources. Wires management ' +
      'groups, hub networking, and logging.',
  },
  {
    filename: 'variables.tf',
    description:
      'Input variables: location, environment, organisation_name, tags, address_space, ' +
      'log_retention_days. Include type, description, and sensible defaults.',
  },
  {
    filename: 'providers.tf',
    description:
      'Required providers (azurerm ~> 4.0, azuread ~> 3.0), backend block for Azure ' +
      'Storage state, and provider features { } block.',
  },
  {
    filename: 'outputs.tf',
    description:
      'Outputs for downstream landing-zone modules: hub_vnet_id, log_analytics_workspace_id, ' +
      'firewall_private_ip, management_group_ids map.',
  },
  {
    filename: 'environments/dev.tfvars',
    description:
      'tfvars file for the dev environment with realistic values that match the ' +
      'captured requirements.',
  },
];

export class IaCGenerator {
  constructor(private llm: LlmService = new LlmService()) {}

  async generate(
    requirements: unknown,
    format: string,
    token: vscode.CancellationToken = new vscode.CancellationTokenSource().token
  ): Promise<IaCTemplate[]> {
    const isBicep = format !== 'terraform';
    const artifacts = isBicep ? BICEP_ARTIFACTS : TERRAFORM_ARTIFACTS;
    const reqJson = JSON.stringify(requirements ?? {}, null, 2);
    const langTag = isBicep ? 'bicep' : 'terraform';
    const lang = isBicep ? 'Bicep' : 'Terraform (HCL)';

    const results: IaCTemplate[] = [];

    for (const spec of artifacts) {
      const systemPrompt =
        `You are a senior Azure cloud architect producing production-grade ${lang} ` +
        `for an Azure Enterprise-Scale Landing Zone. Output ONLY the ${lang} source ` +
        `code wrapped in a single \`\`\`${langTag} fenced block - no commentary ` +
        `outside the fence.`;

      const userPrompt =
        `# File\n${spec.filename}\n\n` +
        `# Purpose\n${spec.description}\n\n` +
        `# Captured Requirements (JSON)\n\`\`\`json\n${reqJson}\n\`\`\`\n\n` +
        `# Constraints\n` +
        `- Follow Microsoft naming conventions: <abbrev>-<workload>-<env>-<region>-<instance>.\n` +
        `- Parameterise environment-specific values.\n` +
        `- Add tags including CostCenter, Owner, Environment, DataClassification.\n` +
        `- Never hardcode subscription IDs, tenant IDs, secrets, or keys.\n` +
        `- Add diagnostic settings to every PaaS resource.\n` +
        `- Include comments explaining non-obvious decisions.`;

      const raw = await this.llm.complete(systemPrompt, userPrompt, token);
      const content =
        raw.trim().length > 0
          ? LlmService.extractCodeBlock(raw, langTag)
          : `// ${spec.filename}\n// LLM generation unavailable.\n`;

      results.push({ filename: spec.filename, content });
    }

    return results;
  }
}

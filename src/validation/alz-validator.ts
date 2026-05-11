/**
 * ALZ Validator
 * Real validation backed by the Bicep extension (preferred) or the Azure CLI
 * (`az bicep build`) plus a lightweight best-practice heuristic pass. If
 * neither is available, syntax validation degrades gracefully to a warning.
 */

import * as fs from 'fs/promises';
import { ExtensionIntegrations } from '../integrations/extension-integrations';

export interface ValidationResult {
  syntaxValid: boolean;
  securityScore: number;
  bestPracticesScore: number;
  issues: string[];
}

interface HeuristicRule {
  id: string;
  pattern: RegExp;
  severity: 'security' | 'best-practice';
  weight: number;
  message: string;
}

/**
 * Lightweight regex-based heuristics. Not a substitute for PSRule / Checkov,
 * but catches the most common ALZ anti-patterns and produces a useful score
 * without external tooling.
 */
const RULES: HeuristicRule[] = [
  {
    id: 'SEC001',
    pattern: /allowBlobPublicAccess\s*:\s*true/i,
    severity: 'security',
    weight: 25,
    message: 'Storage account allows public blob access.',
  },
  {
    id: 'SEC002',
    pattern: /supportsHttpsTrafficOnly\s*:\s*false/i,
    severity: 'security',
    weight: 20,
    message: 'Storage account allows non-HTTPS traffic.',
  },
  {
    id: 'SEC003',
    pattern: /minimumTlsVersion\s*:\s*['"]TLS1_[01]['"]/i,
    severity: 'security',
    weight: 15,
    message: 'Resource uses TLS 1.0 or 1.1; require TLS 1.2 or higher.',
  },
  {
    id: 'SEC004',
    pattern: /publicNetworkAccess\s*:\s*['"]Enabled['"]/i,
    severity: 'security',
    weight: 10,
    message: 'Resource has public network access enabled.',
  },
  {
    id: 'SEC005',
    pattern: /(password|secret|apiKey|connectionString)\s*=\s*['"][^'"@$]+['"]/i,
    severity: 'security',
    weight: 30,
    message: 'Possible hardcoded secret. Use Key Vault or secure parameters.',
  },
  {
    id: 'BP001',
    pattern: /^(?!.*tags\s*[:=])/s,
    severity: 'best-practice',
    weight: 10,
    message: 'No tags defined. Add at least Environment, Owner, CostCenter.',
  },
  {
    id: 'BP002',
    pattern: /^(?!.*diagnosticSettings)/s,
    severity: 'best-practice',
    weight: 10,
    message: 'No diagnostic settings defined for any resource.',
  },
];

export class ALZValidator {
  async validate(filePath: string): Promise<ValidationResult> {
    const issues: string[] = [];

    let content = '';
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        syntaxValid: false,
        securityScore: 0,
        bestPracticesScore: 0,
        issues: [`Could not read file: ${message}`],
      };
    }

    const isBicep = filePath.toLowerCase().endsWith('.bicep');
    const syntaxValid = isBicep
      ? await this.validateBicepSyntax(filePath, issues)
      : await this.validateTerraformSyntax(filePath, issues);

    let securityScore = 100;
    let bestPracticesScore = 100;

    for (const rule of RULES) {
      if (rule.pattern.test(content)) {
        issues.push(`[${rule.id}] ${rule.message}`);
        if (rule.severity === 'security') {
          securityScore -= rule.weight;
        } else {
          bestPracticesScore -= rule.weight;
        }
      }
    }

    return {
      syntaxValid,
      securityScore: Math.max(0, securityScore),
      bestPracticesScore: Math.max(0, bestPracticesScore),
      issues,
    };
  }

  private async validateBicepSyntax(filePath: string, issues: string[]): Promise<boolean> {
    const outcome = await ExtensionIntegrations.buildBicep(filePath);
    if (outcome.ok && outcome.via === 'none') {
      issues.push(
        '[SYN] No Bicep extension or Azure CLI found; syntax check skipped.'
      );
      return true;
    }
    if (!outcome.ok) {
      issues.push(`[SYN] Bicep syntax error (${outcome.via}): ${outcome.message}`);
      return false;
    }
    return true;
  }

  private async validateTerraformSyntax(_filePath: string, issues: string[]): Promise<boolean> {
    // Terraform validates whole modules, not individual files. Defer to a
    // future implementation that runs `terraform validate` against the
    // containing directory.
    issues.push(
      '[SYN] Terraform syntax validation not yet implemented; run `terraform validate` manually.'
    );
    return true;
  }
}

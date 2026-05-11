/**
 * ALZ Validator
 * Real validation backed by the Bicep extension (preferred) or the Azure CLI
 * (`az bicep build`); for Terraform, runs `terraform validate` against the
 * containing module directory. Heuristic security/best-practice rules are
 * loaded from `validation/rules/*.json` so they can be customised without
 * recompiling. Optional Checkov pass when the binary is available.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ExtensionIntegrations } from '../integrations/extension-integrations';

export interface ValidationResult {
  syntaxValid: boolean;
  securityScore: number;
  bestPracticesScore: number;
  issues: string[];
  /** Set when an external scanner (Checkov) ran and produced a count. */
  checkovFindings?: number;
}

interface HeuristicRule {
  id: string;
  pattern: RegExp;
  severity: 'security' | 'best-practice';
  weight: number;
  message: string;
}

interface RuleFileShape {
  rules: Array<{
    id: string;
    pattern: string;
    flags?: string;
    severity: 'security' | 'best-practice';
    weight: number;
    message: string;
  }>;
}

/**
 * Built-in fallback rules used when no rule files are found (e.g. unit tests
 * running outside the workspace).
 */
const FALLBACK_RULES: HeuristicRule[] = [
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
  private rulesCache?: HeuristicRule[];

  constructor(private rulesDir?: string, private runCheckov = true) {}

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

    const rules = await this.loadRules();
    for (const rule of rules) {
      if (rule.pattern.test(content)) {
        issues.push(`[${rule.id}] ${rule.message}`);
        if (rule.severity === 'security') {
          securityScore -= rule.weight;
        } else {
          bestPracticesScore -= rule.weight;
        }
      }
    }

    let checkovFindings: number | undefined;
    if (this.runCheckov) {
      const outcome = await ExtensionIntegrations.runCheckov(filePath);
      if (outcome.missing) {
        issues.push('[CHK] Checkov not on PATH; deep security scan skipped.');
      } else if (outcome.ok || outcome.stdout.length > 0) {
        const failed = this.countCheckovFailures(outcome.stdout);
        if (failed !== undefined) {
          checkovFindings = failed;
          if (failed > 0) {
            issues.push(`[CHK] Checkov reported ${failed} failed check(s).`);
            securityScore -= Math.min(40, failed * 5);
          }
        }
      } else {
        issues.push(
          `[CHK] Checkov failed to run: ${outcome.stderr.split('\n')[0]}`
        );
      }
    }

    return {
      syntaxValid,
      securityScore: Math.max(0, securityScore),
      bestPracticesScore: Math.max(0, bestPracticesScore),
      issues,
      checkovFindings,
    };
  }

  private async loadRules(): Promise<HeuristicRule[]> {
    if (this.rulesCache) {
      return this.rulesCache;
    }
    if (!this.rulesDir) {
      this.rulesCache = FALLBACK_RULES;
      return this.rulesCache;
    }

    const out: HeuristicRule[] = [];
    try {
      const entries = await fs.readdir(this.rulesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) {
          continue;
        }
        const full = path.join(this.rulesDir, entry.name);
        try {
          const raw = await fs.readFile(full, 'utf-8');
          const parsed = JSON.parse(raw) as RuleFileShape;
          for (const r of parsed.rules ?? []) {
            try {
              out.push({
                id: r.id,
                pattern: new RegExp(r.pattern, r.flags ?? ''),
                severity: r.severity,
                weight: r.weight,
                message: r.message,
              });
            } catch (err) {
              console.warn(`[ALZValidator] invalid regex in ${entry.name}/${r.id}:`, err);
            }
          }
        } catch (err) {
          console.warn(`[ALZValidator] could not read ${full}:`, err);
        }
      }
    } catch {
      // rulesDir does not exist - fall through to fallback
    }

    this.rulesCache = out.length > 0 ? out : FALLBACK_RULES;
    return this.rulesCache;
  }

  private countCheckovFailures(stdout: string): number | undefined {
    try {
      const parsed = JSON.parse(stdout);
      const reports = Array.isArray(parsed) ? parsed : [parsed];
      let failed = 0;
      for (const r of reports) {
        const summary = r?.summary;
        if (summary && typeof summary.failed === 'number') {
          failed += summary.failed;
        }
      }
      return failed;
    } catch {
      return undefined;
    }
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

  private async validateTerraformSyntax(filePath: string, issues: string[]): Promise<boolean> {
    const dir = path.dirname(filePath);
    const outcome = await ExtensionIntegrations.validateTerraform(dir);
    if (outcome.missing) {
      issues.push(
        '[SYN] Terraform CLI not on PATH; install Terraform to enable syntax validation.'
      );
      return true;
    }
    if (!outcome.ok) {
      issues.push(`[SYN] terraform validate failed: ${outcome.stderr.split('\n')[0]}`);
      return false;
    }
    return true;
  }
}

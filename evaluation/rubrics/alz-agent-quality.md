# ALZ Agent Quality Rubric

> **Evaluation criteria for Landing Zone Provisioning Agent recommendations and artifacts**

## Scoring Framework

| Score | Rating | Description |
|-------|--------|-------------|
| 5 | Excellent | Exceeds best practices; production-ready without modification |
| 4 | Good | Meets best practices; minor improvements possible |
| 3 | Acceptable | Functional but requires notable improvements |
| 2 | Poor | Missing critical elements; significant rework needed |
| 1 | Unacceptable | Incorrect or unusable; does not meet requirements |

## Evaluation Dimensions

### 1. Recommendation Accuracy (Weight: 30%)

**Criteria**: Does the architectural recommendation align with Microsoft best practices and user requirements?

**5 - Excellent**:
- Recommendation matches gold standard for scenario (validated by Microsoft FTE)
- All 8 design areas considered
- Tradeoffs explicitly explained
- Alternatives discussed with rationale

**3 - Acceptable**:
- Recommendation is valid but not optimal
- Some design areas not fully addressed
- Limited tradeoff analysis

**1 - Unacceptable**:
- Recommendation conflicts with Azure Landing Zone principles
- Major design areas ignored
- No justification provided

**Examples**:
- ✅ Excellent: "Virtual WAN recommended for 4+ regions with mesh connectivity (Cost: $8K/mo). Alternative: Hub-spoke in each region with VNet peering (Cost: $4K/mo, Complexity: High, No global transit)"
- ❌ Unacceptable: "Use hub-spoke" (no context, no alternatives, no tradeoff analysis)

### 2. IaC Quality (Weight: 25%)

**Criteria**: Does generated infrastructure-as-code follow best practices and deploy successfully?

**5 - Excellent**:
- Passes `az bicep build` or `terraform validate` with zero errors
- Security scan score ≥95/100
- Uses Azure Verified Modules
- Includes comprehensive parameter files (dev/test/prod)
- Deploys successfully in test subscription

**3 - Acceptable**:
- Minor syntax warnings (non-blocking)
- Security scan score 85-94/100
- Some hardcoded values that should be parameters
- Deploys with manual intervention

**1 - Unacceptable**:
- Syntax errors prevent deployment
- Critical security vulnerabilities (score <70/100)
- Hardcoded secrets
- Deployment fails

**Examples**:
- ✅ Excellent: Bicep template with parameterized naming, Key Vault references, private endpoints, passes checkov 95/100
- ❌ Unacceptable: Terraform with hardcoded subscription IDs, public endpoints on management VMs, fails validation

### 3. ADR Completeness (Weight: 15%)

**Criteria**: Are Architecture Decision Records comprehensive and well-structured?

**5 - Excellent**:
- Follows MADR template exactly
- All sections populated (Title, Status, Context, Decision, Consequences, Alternatives)
- 2-3 alternatives considered with pros/cons
- Links to Microsoft Learn documentation
- Cross-references related ADRs

**3 - Acceptable**:
- MADR template mostly followed
- Some sections sparse (e.g., Alternatives has only 1 option)
- Missing documentation links
- No cross-references

**1 - Unacceptable**:
- Missing required sections
- No alternatives considered
- Decision not justified
- No links or references

**Examples**:
- ✅ Excellent: ADR-001 compares Hub-Spoke, Virtual WAN, and Multi-Hub-Spoke with cost/complexity/scalability matrix; links to 3 Microsoft docs
- ❌ Unacceptable: "Decision: We chose Virtual WAN. Done." (no context, no alternatives, no justification)

### 4. Security Posture (Weight: 15%)

**Criteria**: Does the design follow security best practices and minimize attack surface?

**5 - Excellent**:
- Zero critical vulnerabilities in checkov scan
- No public IPs on management resources
- All storage/databases use private endpoints
- Azure Firewall enforced for hub egress
- Secrets in Key Vault only
- NSGs properly configured

**3 - Acceptable**:
- 1-2 medium-severity vulnerabilities
- Some resources missing private endpoints
- Azure Firewall recommended but not enforced
- Minor NSG gaps

**1 - Unacceptable**:
- Critical vulnerabilities (RDP from 0.0.0.0/0)
- Hardcoded secrets in templates
- No Azure Firewall in hub
- Management resources publicly accessible

**Examples**:
- ✅ Excellent: All hub/spoke traffic through Azure Firewall; management VMs in isolated subnet with NSG denying internet; Key Vault for all secrets
- ❌ Unacceptable: Management VM with public IP and RDP from internet; connection strings hardcoded in Bicep

### 5. Documentation Quality (Weight: 10%)

**Criteria**: Is deployment documentation clear, accurate, and actionable?

**5 - Excellent**:
- Step-by-step runbook with commands, expected outputs, estimated time
- Prerequisites checklist (Azure CLI version, permissions, service principals)
- Troubleshooting section with common errors and fixes
- Architecture diagrams render correctly
- Glossary and FAQ provided

**3 - Acceptable**:
- Runbook has most steps but missing some details
- Prerequisites listed but not comprehensive
- Limited troubleshooting guidance
- Diagrams present but basic

**1 - Unacceptable**:
- No runbook or incomplete steps
- Missing prerequisites
- No troubleshooting help
- Diagrams don't render or are incorrect

**Examples**:
- ✅ Excellent: Runbook with 15 steps, each with command + expected output + "If this fails, check..."; diagrams show management groups + network topology
- ❌ Unacceptable: "Run az deployment tenant create and hope it works" (no parameters, no validation, no troubleshooting)

### 6. Conformance to Design Principles (Weight: 5%)

**Criteria**: Does the design follow Azure Landing Zone design principles?

**5 - Excellent**:
- ✅ Subscription democratization (policy-driven)
- ✅ Policy-driven governance (no manual locks)
- ✅ Single control plane (Azure only)
- ✅ Application-centric design
- ✅ Hybrid connectivity via hub
- Management group depth ≤4 levels

**3 - Acceptable**:
- Most principles followed
- 1-2 minor deviations with justification

**1 - Unacceptable**:
- Multiple design principles violated
- No justification for deviations
- Manual processes instead of policy

**Examples**:
- ✅ Excellent: Policy-enforced naming, RBAC at management group, automated subscription vending, depth=3
- ❌ Unacceptable: Manual subscription creation process, depth=6 management groups, parallel Terraform + Portal deployment

## Composite Score Calculation

```
Final Score = (Accuracy × 0.30) + (IaC Quality × 0.25) + (ADR Completeness × 0.15) 
            + (Security × 0.15) + (Documentation × 0.10) + (Conformance × 0.05)
```

**Pass Threshold**: ≥4.0 / 5.0 (80%)

**Target**: ≥4.5 / 5.0 (90%) for production release

## Example Evaluation

### Scenario: 50 subscriptions, 3 regions, Virtual WAN

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Recommendation Accuracy | 5.0 | Virtual WAN correctly recommended; tradeoffs explained; alternatives considered |
| IaC Quality | 4.5 | Bicep passes validation; checkov 92/100; deploys successfully; one hardcoded tag |
| ADR Completeness | 4.0 | MADR template followed; 2 alternatives; missing 1 documentation link |
| Security Posture | 5.0 | Zero critical vulns; private endpoints; Azure Firewall enforced; secrets in Key Vault |
| Documentation Quality | 4.5 | Comprehensive runbook; troubleshooting included; diagrams clear; minor typo |
| Conformance | 5.0 | All design principles followed; depth=3; policy-driven |

**Final Score**: (5.0×0.30) + (4.5×0.25) + (4.0×0.15) + (5.0×0.15) + (4.5×0.10) + (5.0×0.05) = **4.73 / 5.0 (95%)**

**Result**: ✅ **PASS** - Excellent quality; production-ready

---

**Last Updated**: 2026-05-11  
**Version**: 1.0.0

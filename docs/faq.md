# Azure Landing Zone Agent - Frequently Asked Questions

## General Questions

### What is the Landing Zone Provisioning Agent?
An AI-powered conversational agent for Visual Studio Code that guides cloud architects through designing and deploying Azure Landing Zones using Microsoft's Enterprise-Scale reference architecture. It provides interactive decision-making support, generates infrastructure-as-code, and creates architecture documentation.

### Do I need a GitHub Copilot subscription?
Yes. The agent runs on the GitHub Copilot platform and requires an active subscription (Individual, Business, or Enterprise).

### What Azure Landing Zone patterns does the agent support?
The agent supports both major networking topologies:
- **Hub-Spoke**: Traditional hub VNet with peered spoke VNets
- **Virtual WAN**: Microsoft-managed global network with automated routing

It covers all 8 Azure Landing Zone design areas and generates Enterprise-Scale aligned templates.

### Can the agent deploy resources to my Azure subscription?
No. The agent generates infrastructure-as-code templates (Bicep or Terraform) and deployment instructions, but does NOT execute actual deployments. You maintain full control over when and how resources are deployed.

## Design and Architecture

### When should I use hub-spoke vs Virtual WAN?
**Hub-Spoke** is recommended when:
- You have fewer than 5 Azure regions
- You want to minimize cost ($2K-4K/month for hub)
- Your team is familiar with traditional networking
- You don't need global mesh connectivity

**Virtual WAN** is recommended when:
- You have 4+ Azure regions with mesh connectivity needs
- You want automated routing and simplified operations
- Budget allows for higher cost ($5K-10K/month base + per-region hubs)
- You're building a global application

The agent will ask clarifying questions and recommend the best option for your scenario.

### How deep should my management group hierarchy be?
Microsoft recommends **4 levels or fewer** (including root tenant). Example:
```
Tenant Root (Level 1)
└── Platform (Level 2)
    ├── Connectivity (Level 3)
    ├── Identity (Level 3)
    └── Management (Level 3)
└── Landing Zones (Level 2)
    ├── Corp (Level 3)
    └── Online (Level 3)
```

Deeper hierarchies increase policy inheritance complexity and make troubleshooting harder.

### What's the difference between Corp and Online management groups?
- **Corp**: Internal-facing applications (intranets, line-of-business apps) with corporate network access. No direct internet exposure.
- **Online**: Public-facing applications (websites, APIs) that require internet access. May have reverse proxies but no unauthenticated corporate network traffic.

### Can I customize the generated infrastructure-as-code?
Absolutely. The generated templates are fully customizable. The agent provides a production-ready starting point aligned with Enterprise-Scale patterns, and you can modify as needed for your organization's specific requirements.

## Technical Questions

### What MCP servers does the agent use?
- **microsoft-docs**: Retrieves latest Azure documentation from Microsoft Learn
- **azure**: Queries Azure Resource Graph for subscription info and available regions
- **bicep**: Validates Bicep syntax and provides resource schemas
- **github**: Accesses Enterprise-Scale repository for reference templates

### What if an MCP server is unavailable?
The agent includes fallback mechanisms:
- Uses cached documentation (as of agent release date)
- Skips optional validations (e.g., subscription queries)
- Notifies you: "⚠️ Using cached documentation. Check Microsoft Learn for latest updates."

### How does the agent ensure security?
- Runs `checkov` security scanner on all generated infrastructure-as-code
- Auto-fixes common vulnerabilities (missing encryption, public endpoints)
- Requires score ≥90/100 to pass validation
- Never stores credentials or secrets
- Generated IaC uses Key Vault references for sensitive data

### Can I use the agent offline?
Not fully. The agent requires internet access for:
- GitHub Copilot LLM backend
- MCP server queries (Microsoft docs, Azure APIs)

However, it can operate in degraded mode with cached documentation if internet is intermittent.

### What Azure CLI version do I need?
Azure CLI 2.50.0 or newer is recommended for Bicep support. Check your version:
```bash
az --version
```

Upgrade if needed:
```bash
az upgrade
```

## Usage Questions

### How do I start a new design session?
Open VS Code Copilot Chat and type:
```
@alz help me design a landing zone for [your requirements]
```

Or use the slash command:
```
@alz /design
```

The agent will guide you through clarifying questions and architectural decisions.

### Can I pause and resume a design session?
Yes. The agent automatically saves your conversation and decisions to `.vscode/alz-agent-session.json`. After a VS Code restart, type:
```
@alz continue
```

The agent will resume from where you left off.

### How do I validate my existing architecture?
Describe your current design to the agent, then run:
```
@alz /validate
```

The agent will check against Azure Landing Zone principles and report CRITICAL / WARNING / INFO issues.

### What if I disagree with a recommendation?
The agent provides guidance based on Microsoft best practices, but you make the final decisions. When you choose a different approach, the agent will:
1. Document your decision in ADRs
2. Explain potential tradeoffs
3. Proceed with your preference

### How long does IaC generation take?
Typically **15-30 seconds** for complete Bicep or Terraform templates, including:
- Main deployment files
- Policy definitions
- Network configuration
- Parameter files for dev/test/prod environments

## Troubleshooting

### The agent isn't responding. What should I check?
1. Verify GitHub Copilot is active (look for Copilot icon in VS Code status bar)
2. Check internet connectivity
3. Restart VS Code
4. Clear session history: `@alz reset`
5. Review `.vscode/alz-agent.log` for errors

### Generated Bicep templates fail validation. How do I fix?
1. Check the error message from `az bicep build`
2. Ask the agent: `@alz The Bicep build failed with error: [paste error]. How do I fix this?`
3. The agent will analyze and suggest corrections
4. Common issues: resource type typos, missing required properties, invalid parameter references

### Security scan failed. What does this mean?
The agent runs `checkov` to scan for security issues. Common failures:
- **Hardcoded secrets**: Use Key Vault references instead
- **Public endpoints**: Enable private endpoints for storage/databases
- **Missing encryption**: Enable encryption at rest for storage accounts

The agent will auto-fix many issues. For manual fixes, check the validation report in `docs/validation-report.md`.

### Can I use Terraform instead of Bicep?
Yes! When generating infrastructure-as-code, specify your preference:
```
@alz /generate terraform
```

Or set your default in VS Code settings:
```json
"alz-agent.preferredIaC": "terraform"
```

## Best Practices

### Should I create ADRs for every decision?
Create ADRs for **significant architectural decisions** that:
- Have long-term impact (networking topology, management group structure)
- Involve tradeoffs (cost vs capability)
- May need to be revisited or explained to stakeholders
- Set precedents for future decisions

Skip ADRs for minor configuration choices (naming conventions, tag formats).

### How many subscriptions should I start with?
Minimum recommended structure:
- **3 Platform subscriptions**: Connectivity, Identity, Management
- **2-4 Landing Zone subscriptions**: Dev, Test, Prod (for Corp), Prod (for Online)

**Total: 5-7 subscriptions** to start

You can add more landing zone subscriptions as you onboard applications.

### When should I use ExpressRoute vs VPN?
**ExpressRoute** when:
- You need bandwidth >1 Gbps
- Low latency is critical (<10ms)
- Your organization has budget for dedicated circuit ($500-5000/month)
- High availability is required (dual circuits)

**VPN** when:
- Bandwidth <1 Gbps is sufficient
- Latency <50ms is acceptable
- Budget-constrained ($140/month for VPN gateway)
- Temporary or backup connectivity

**Both** for maximum redundancy (ExpressRoute primary, VPN backup).

### How often should I review my landing zone design?
- **Quarterly**: Review Azure roadmap for new services/features
- **Bi-annually**: Validate policies against changing compliance requirements
- **Annually**: Re-assess networking topology and management group structure
- **Ad-hoc**: When significant business changes occur (M&A, new regions, major applications)

## Pricing and Cost

### How much does the agent cost?
The agent itself is **free** with a GitHub Copilot subscription. You only pay for Azure resources deployed to your subscription.

### What's the typical cost of an Azure Landing Zone?
**Platform Landing Zone** (foundation):
- Hub-Spoke: $2K-4K/month (hub VNet, Azure Firewall, VPN gateway)
- Virtual WAN: $5K-10K/month (base + per-region secured hubs)

**Application Landing Zones** (per workload):
- Highly variable based on compute, storage, and database needs
- Typically $500-10K+/month per application

The agent provides cost estimates during design based on your selections.

### Can the agent help optimize costs?
Yes, the agent:
- Recommends cost-effective topologies (hub-spoke for <5 regions)
- Suggests right-sized resources (VPN gateway SKUs)
- Includes cost comparison tables in ADRs

For ongoing cost optimization, use Azure Cost Management + Billing and Azure Advisor (outside agent scope).

## Support and Feedback

### How do I report a bug or request a feature?
- **GitHub Issues**: [ALZAgent Issues](https://github.com/SQLMiguel/ALZAgent/issues)
- **Discussions**: [ALZAgent Discussions](https://github.com/SQLMiguel/ALZAgent/discussions)

### Where can I learn more about Azure Landing Zones?
- **Microsoft Learn**: [Azure Landing Zone Documentation](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/)
- **Enterprise-Scale**: [GitHub Repository](https://github.com/Azure/Enterprise-Scale)
- **Cloud Adoption Framework**: [CAF Overview](https://learn.microsoft.com/azure/cloud-adoption-framework/)

### Can I contribute to the agent?
Yes! The agent is open-source under Apache 2.0 license. See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on:
- Submitting pull requests
- Adding new features
- Improving documentation
- Reporting issues

---

**Still have questions?** Ask in [GitHub Discussions](https://github.com/SQLMiguel/ALZAgent/discussions) or reach out to the community.

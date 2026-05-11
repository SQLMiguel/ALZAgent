# Landing Zone Discovery Questionnaire

Let's gather the requirements needed to design your Azure Landing Zone. Answer as many as you can - we can defer anything you're not sure about.

## 1. Organisation & Scale

1. **Organisation name** and target Azure tenant (or "new tenant").
2. **Number of subscriptions** anticipated in the next 12 months (rough estimate is fine).
3. **Number of workloads / applications** to onboard initially.
4. **Geographic regions** required (e.g., `East US`, `West Europe`, `Australia East`).
5. **Compliance frameworks** in scope (e.g., ISO 27001, SOC 2, HIPAA, PCI DSS, FedRAMP, CMMC, NIST 800-53, GDPR, none).

## 2. Identity & Access

6. **Existing Microsoft Entra ID tenant**, or greenfield?
7. **Hybrid identity** required? (Entra Connect / Cloud Sync from on-premises AD?)
8. **Privileged Identity Management (PIM)** - required or out of scope?
9. **External identity** scenarios (B2B guests, B2C customers)?

## 3. Network Topology

10. **Connectivity model** preference:
    - `hub-spoke` (traditional, full control)
    - `virtual-wan` (Microsoft-managed hub, scalable)
    - `unsure` (I'll recommend based on your scale)
11. **Hybrid connectivity** to on-premises? If yes: `expressroute`, `vpn-site-to-site`, or `both`.
12. **DNS strategy**: Azure Private DNS, Azure DNS Private Resolver, on-premises forwarders, or third-party?
13. **Egress control**: Azure Firewall, third-party NVA (Palo Alto / Fortinet / Check Point), or none?
14. **Address spaces** already allocated (CIDR ranges to avoid)?

## 4. Security & Governance

15. **Microsoft Defender for Cloud** - enable across all subscriptions? Which plans (Servers, App Service, Storage, SQL, Containers, Key Vault, ARM, DNS, APIs)?
16. **Microsoft Sentinel** SIEM - in scope?
17. **Encryption requirements** - customer-managed keys (CMK) for storage / disks / SQL?
18. **Tagging strategy** - mandatory tags (e.g., `CostCenter`, `Owner`, `Environment`, `DataClassification`)?
19. **Diagnostic settings destination** - central Log Analytics workspace, Event Hub, Storage account, or all three?

## 5. Platform & Workloads

20. **Subscription model** - one platform subscription each for Identity / Management / Connectivity, or consolidated?
21. **Application landing zone** archetypes needed:
    - `corp` (corporate workloads, private connectivity)
    - `online` (internet-facing workloads)
    - `confidential-corp` / `confidential-online` (workloads with confidential computing requirements)
    - `sap`, `avs` (Azure VMware Solution), `hpc`, `data` accelerators?
22. **Workload types** initially deployed (AKS, Azure Functions, App Service, VMs, Synapse, Databricks, etc.)?

## 6. Operations & DevOps

23. **IaC preference** - `bicep` or `terraform`?
24. **Deployment pipeline** - GitHub Actions, Azure DevOps, both, or other?
25. **Environment promotion** model - branch-based, ring-based, or other?
26. **Cost guardrails** - monthly budget per landing zone? Hard or soft enforcement?

---

**Just answer what you know.** Defaults exist for everything - I'll surface assumptions explicitly when I produce the design. When you're ready, paste your answers (in any format) and I'll synthesise the design and ADRs.

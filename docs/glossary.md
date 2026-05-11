# Azure Landing Zone Glossary

> **Terms and definitions used in Azure Landing Zone architecture and this agent**

## A

**ADR (Architecture Decision Record)**  
A document that captures an architectural decision, including context, the decision made, consequences, and alternatives considered. Follows the MADR (Markdown Any Decision Records) format.

**Application Landing Zone**  
A subscription or set of subscriptions dedicated to hosting application workloads. Sits under the "Landing Zones" management group and inherits platform policies.

**Azure AD (Azure Active Directory)**  
Microsoft's cloud-based identity and access management service. Now called "Microsoft Entra ID" but commonly referred to as Azure AD.

**Azure Firewall**  
Microsoft's managed, cloud-based network security service that protects Azure Virtual Network resources with stateful firewall capabilities.

**Azure Landing Zone (ALZ)**  
A standardized, enterprise-ready Azure environment with governance, security, and connectivity foundations. Based on Microsoft's Cloud Adoption Framework best practices.

**Azure Policy**  
Azure service for creating, assigning, and managing policies that enforce rules and effects over resources to ensure they stay compliant with corporate standards.

**Azure Resource Manager (ARM)**  
The deployment and management service for Azure. Provides a consistent management layer for creating, updating, and deleting resources.

**Azure Verified Modules (AVM)**  
Microsoft-maintained library of production-ready, reusable Infrastructure-as-Code modules for Bicep and Terraform.

## B

**Bicep**  
Domain-specific language (DSL) for deploying Azure resources declaratively. Compiles to ARM templates with simpler, more readable syntax than JSON.

**Best Practice**  
Recommended approach or configuration based on Microsoft guidance, industry standards, and real-world experience.

## C

**Cloud Adoption Framework (CAF)**  
Microsoft's comprehensive guide for cloud adoption, including methodologies for strategy, planning, readiness, migration, innovation, governance, and management.

**Connectivity Management Group**  
Management group under "Platform" that contains subscriptions hosting networking resources (hub VNets, VPN/ExpressRoute gateways, Azure Firewall).

**Corp Management Group**  
Management group under "Landing Zones" for internal-facing workloads that require corporate network access and traditional IP routing connectivity.

## D

**Design Area**  
One of eight critical aspects of Azure Landing Zone architecture: Billing & Tenant, Identity & Access, Resource Organization, Network Topology & Connectivity, Security, Management, Governance, Automation & DevOps.

**Deployment Runbook**  
Step-by-step guide for deploying infrastructure, including prerequisites, commands, expected outputs, and troubleshooting.

## E

**Enterprise-Scale**  
Microsoft's reference implementation of Azure Landing Zones, providing production-ready templates and deployment automation for large-scale Azure environments.

**ExpressRoute**  
Azure service providing private, high-bandwidth, low-latency connections between on-premises datacenters and Azure, bypassing the public internet.

## F

**Fallback Behavior**  
Agent's response when primary data sources are unavailable or confidence is low (e.g., using cached documentation when MCP server is offline).

## G

**Grounding**  
Process of retrieving relevant documentation and context from authoritative sources to inform LLM responses, reducing hallucinations and improving accuracy.

## H

**Hub-Spoke Topology**  
Network architecture where a central "hub" VNet connects to multiple "spoke" VNets via peering. Hub hosts shared services (Azure Firewall, VPN gateway).

**Hybrid Connectivity**  
Network connection between on-premises infrastructure and Azure, typically using ExpressRoute or VPN Gateway.

## I

**IaC (Infrastructure-as-Code)**  
Managing and provisioning infrastructure through code (Bicep, Terraform) instead of manual processes or UI clicks.

**Identity Management Group**  
Management group under "Platform" containing subscriptions that host identity services (e.g., Active Directory Domain Services VMs).

## L

**Landing Zone**  
Pre-configured, secure, and compliant Azure environment ready to host application workloads. Includes networking, security, governance, and management foundations.

## M

**MADR (Markdown Any Decision Records)**  
Lightweight template format for documenting architecture decisions in Markdown, standardized and widely adopted.

**Management Group**  
Container for organizing Azure subscriptions and applying policies at scale. Supports hierarchical organization up to 6 levels deep (4 recommended).

**Management Management Group**  
Management group under "Platform" containing subscriptions for shared management and monitoring resources (Log Analytics, Azure Monitor, backup vaults).

**MCP (Model Context Protocol)**  
Standardized protocol for AI agents to access external tools and data sources (documentation, APIs, code repositories).

**Microsoft Entra ID**  
New name for Azure Active Directory (Azure AD). Microsoft's cloud identity and access management service.

**Microsoft Learn**  
Microsoft's official documentation and training platform, including Azure Landing Zone guidance and Cloud Adoption Framework.

## N

**Network Security Group (NSG)**  
Azure resource that filters network traffic to and from Azure resources in a virtual network using security rules.

**Networking Topology**  
Overall structure and design of network connectivity in Azure, typically either Hub-Spoke or Virtual WAN.

## O

**Online Management Group**  
Management group under "Landing Zones" for public-facing workloads that require direct internet access (e.g., web applications, APIs).

## P

**Phase Pipeline**  
Structured workflow the agent follows: Discovery → Design → ADR Generation → Validation → IaC Generation → Documentation → Self-Review.

**Platform Landing Zone**  
Foundational Azure environment hosting shared services (connectivity, identity, management) that support application landing zones.

**Policy Assignment**  
Act of applying an Azure Policy definition or initiative to a management group, subscription, or resource group scope.

**Policy-Driven Governance**  
Approach where Azure Policy automatically enforces compliance and configuration standards rather than manual processes.

## R

**RAG (Retrieval-Augmented Generation)**  
AI technique where relevant context is retrieved from external sources (documentation, code) before generating a response, improving accuracy.

**Resource Organization**  
Design area covering how subscriptions and resources are structured using management groups, naming conventions, and tagging strategies.

## S

**Sandbox Management Group**  
Optional management group for experimental or development subscriptions with relaxed policies, isolated from production environments.

**Security Management Group**  
Management group under "Platform" for subscriptions hosting security services (Key Vault for platform secrets, Managed HSM).

**Subscription Democratization**  
Design principle where application teams can request and provision subscriptions through automated workflows, not manual IT processes.

## T

**Terraform**  
Open-source Infrastructure-as-Code tool by HashiCorp for provisioning and managing cloud resources using declarative configuration files (.tf).

**Tradeoff Analysis**  
Evaluation of pros and cons for architectural alternatives, helping architects make informed decisions.

## V

**Virtual Network (VNet)**  
Isolated network in Azure, enabling resources to securely communicate with each other, the internet, and on-premises networks.

**Virtual WAN (vWAN)**  
Microsoft-managed global network service providing optimized and automated branch connectivity to and through Azure with hub-spoke mesh topology.

**VPN Gateway**  
Azure service enabling encrypted connections between Azure VNets and on-premises networks over the public internet.

## W

**Well-Architected Framework (WAF)**  
Microsoft's architectural guidance organized around five pillars: Reliability, Security, Cost Optimization, Operational Excellence, and Performance Efficiency.

## Z

**Zone Redundancy**  
Azure feature distributing resources across multiple availability zones within a region for high availability and disaster recovery.

---

**Last Updated**: 2026-05-11  
**Source**: Azure Landing Zone documentation, Cloud Adoption Framework, Well-Architected Framework

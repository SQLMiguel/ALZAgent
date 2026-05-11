# Landing Zone Provisioning Agent for GitHub Copilot

> **AI-powered conversational agent that guides cloud architects through Azure Landing Zone design and deployment**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85.0+-blue.svg)](https://code.visualstudio.com/)
[![GitHub Copilot](https://img.shields.io/badge/GitHub%20Copilot-Required-green.svg)](https://github.com/features/copilot)

## Overview

The **Landing Zone Provisioning Agent** is a specialized GitHub Copilot agent for Visual Studio Code that transforms Azure Landing Zone design from a weeks-long manual process into an interactive, guided conversation. Built on the [AgentX framework](https://github.com/jnPiyush/AgentX), it combines expert knowledge of the [Azure Enterprise-Scale Landing Zone architecture](https://github.com/Azure/Enterprise-Scale) with Microsoft documentation and best practices to deliver production-ready infrastructure-as-code.

### Key Capabilities

- **🏗️ Interactive Architecture Design**: Guided decision trees across all 8 Azure Landing Zone design areas (billing, identity, networking, security, governance, management, resource organization, automation)
- **📋 Automatic ADR Generation**: Produces Architecture Decision Records from conversations with tradeoff analysis and alternatives
- **⚙️ Infrastructure-as-Code**: Generates validated Bicep or Terraform templates aligned with Enterprise-Scale patterns
- **✅ Best Practice Validation**: Validates designs against Azure Landing Zone principles and Well-Architected Framework
- **📊 Visual Diagrams**: Creates Mermaid architecture diagrams for management groups, networking topology, and data flows
- **📖 Knowledge Transfer**: Explains the "why" behind decisions, not just the "what"

## Problem Statement

Cloud architects spend **4-8 weeks** designing Azure Landing Zones, navigating 200+ pages of documentation, making critical decisions without clear guidance, and often deploying configurations that require costly rework. This agent reduces that cycle to **2 weeks** with AI-guided decision-making and automated artifact generation.

## Documentation

📄 **[Product Requirements Document (PRD)](docs/artifacts/prd/PRD-ALZ-Agent.md)** - Complete product specification with requirements, user stories, success metrics, and roadmap

### What's Included in the PRD

1. **Executive Summary**: Problem statement, solution overview, success metrics (75% time reduction, 95% conformance, NPS >= 50)
2. **Research Summary**: Evidence from Azure Landing Zone docs, Enterprise-Scale repo, Cloud Adoption Framework, and AgentX patterns
3. **Goals and Non-Goals**: What v1.0 delivers and what's explicitly deferred (brownfield migration, workload accelerators, multi-cloud)
4. **User Personas**: Enterprise Cloud Architect, DevOps Engineer, IT Manager/CTO
5. **Functional Requirements**: 15 detailed requirements with acceptance criteria (architecture guidance, ADR generation, IaC generation, documentation)
6. **Non-Functional Requirements**: Performance (< 5s response), security (no credential leakage), usability (60 min to first deployment)
7. **AI/ML Capabilities**: Conversational architecture consulting, RAG with Microsoft docs, tool boundaries, fallback behavior, quality thresholds
8. **User Stories**: 13 stories across 5 epics (107 story points total)
9. **Dependencies and Risks**: GitHub Copilot API, MCP servers, LLM hallucinations, adoption challenges
10. **Timeline**: 5-month roadmap to GA, v1.1 and v2.0 feature plans

## Quick Start

### Prerequisites

- Visual Studio Code 1.85.0 or newer
- GitHub Copilot subscription (Individual, Business, or Enterprise)
- Azure subscription (for testing generated templates)
- PowerShell 7.4+ (Windows) or Bash (Linux/macOS)

### Installation

```bash
# Clone the repository
git clone https://github.com/SQLMiguel/ALZAgent.git
cd ALZAgent

# Open in VS Code
code .

# The agent will be available as @alz in GitHub Copilot Chat once implemented
```

### Usage

```
# Start a new landing zone design session
@alz help me design a landing zone for 50 subscriptions with hybrid connectivity

# Validate your architecture
@alz /validate

# Generate Bicep templates
@alz /generate bicep

# Create an architecture diagram
@alz /diagram
```

## Project Structure

```
ALZAgent/
├── docs/
│   ├── artifacts/
│   │   ├── prd/
│   │   │   └── PRD-ALZ-Agent.md           # Product Requirements Document
│   │   ├── decisions/                      # Architecture Decision Records (ADRs)
│   │   └── diagrams/                       # Architecture diagrams (Mermaid)
│   └── deployment/                         # Deployment runbooks and guides
├── .github/
│   ├── agents/
│   │   └── alz-agent.agent.md             # Agent definition (to be created)
│   └── skills/                             # Domain-specific skills (to be created)
└── README.md                               # This file
```

## Success Metrics (Target for v1.0)

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Time to First Deployment** | 2 weeks (75% reduction from 8 weeks) | Architect productivity |
| **Design Quality** | 95% conformance with ALZ design principles | Quality assurance |
| **Adoption Rate** | 60% of VS Code architects within 6 months | Market penetration |
| **Error Reduction** | 70% fewer post-deployment config errors | Operational excellence |
| **User Satisfaction** | NPS >= 50 | Customer delight |
| **Knowledge Transfer** | 80% report improved ALZ understanding | Learning outcome |

## Architecture

The agent leverages:

- **GitHub Copilot LLM Backend**: GPT-4/Claude for conversational intelligence
- **MCP Servers**: 
  - `microsoft-docs`: Real-time Microsoft Learn documentation retrieval
  - `azure`: Azure Resource Graph queries, resource management, RBAC
  - `bicep`: Bicep validation, resource type schemas, best practices
  - `github`: Enterprise-Scale repository access, code examples
- **Skills**: Reuses AgentX skills (`azure`, `bicep`, `architecture`, `diagram-as-code`)

## Roadmap

### v1.0 (GA Launch - Month 5)
- ✅ Interactive design guidance across 8 design areas
- ✅ ADR generation with versioning
- ✅ Bicep and Terraform template generation
- ✅ Best practice validation
- ✅ Architecture diagram generation
- ✅ VS Code GitHub Copilot integration

### v1.1 (Month 8)
- 🔲 Visual diagram export (PNG/SVG)
- 🔲 Azure DevOps/GitHub repo setup
- 🔲 Cost estimation
- 🔲 Pre-deployment validation
- 🔲 Session sync across devices

### v2.0 (Month 17)
- 🔲 Brownfield landing zone assessment
- 🔲 Migration planning
- 🔲 Workload accelerators (SAP, AKS, AVD)
- 🔲 Compliance packs (FedRAMP, HIPAA, PCI-DSS)

## Contributing

This project follows the [AgentX contribution guidelines](https://github.com/jnPiyush/AgentX/blob/master/CONTRIBUTING.md).

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build extension
npm run build
```

## Reference Architecture

Based on:
- **Azure Landing Zones**: [Microsoft Cloud Adoption Framework](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/)
- **Enterprise-Scale**: [Azure/Enterprise-Scale GitHub Repository](https://github.com/Azure/Enterprise-Scale)
- **AgentX Framework**: [jnPiyush/AgentX](https://github.com/jnPiyush/AgentX)

## License

Apache 2.0 - See [LICENSE](LICENSE) file for details

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/SQLMiguel/ALZAgent/issues)
- 💬 [Discussions](https://github.com/SQLMiguel/ALZAgent/discussions)

---

**Status**: 📋 PRD Phase - Product Requirements Document completed, ready for stakeholder review and development kickoff

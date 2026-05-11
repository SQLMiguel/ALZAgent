# ALZ Agent v1.0 - Development Roadmap

> **Status**: ✅ Phase 2 Complete  
> **Next Phase**: 🧪 Phase 3 Testing & Validation  
> **Target GA**: Q2 2026

---

## ✅ Phase 1: Foundation (Complete)

**Duration**: Week 1  
**Status**: ✅ **DONE**

### Deliverables
- [x] Comprehensive PRD with 15 sections, 107 story points
- [x] Agent definition file (`.github/agents/alz-agent.agent.md`)
- [x] Technical architecture with Mermaid diagrams
- [x] Project scaffolding (package.json, tsconfig.json, .gitignore)
- [x] Documentation (README, FAQ, glossary, CONTRIBUTING, LICENSE)
- [x] Evaluation framework (rubrics, datasets)
- [x] Directory structure for src/, prompts/, validation/

### Key Decisions
- **Technology Stack**: TypeScript + VS Code Extension API + LangChain RAG
- **IaC Support**: Bicep (primary) + Terraform (secondary)
- **MCP Integration**: microsoft-docs, azure, bicep, github servers
- **Phase Pipeline**: 7 phases with mandatory gates (Discovery → Design → ADR → Validation → IaC → Documentation → Self-Review)

---

## ✅ Phase 2: Core Implementation (Complete)

**Duration**: Weeks 2-8  
**Status**: ✅ **COMPLETE** - only coverage tooling + 100-scenario eval run deferred to Phase 3

### Week 2-3: Agent Core
- [x] Implement `handler.ts` with command routing (`/design`, `/validate`, `/generate`, `/diagram`, **plus `/status` and `/deploy`**)
- [x] Implement `phase-pipeline.ts` state machine with gate validation
- [x] Implement `conversation-manager.ts` session persistence
- [~] Unit tests for state management (12 tests passing across 3 suites; coverage measurement not yet wired up)

### Week 4-5: RAG Engine & MCP Integration
- [x] Implement `rag-engine.ts` (**BM25 over markdown** - chosen over LangChain vector store for zero-dependency, no-API-key operation)
- [x] Integrate Azure MCP (**via `vscode.lm.tools` API** - lights up `azmcp-bicepschema`, `wellarchitectedframework`, `policy`, `resource_graph`, etc. when the Azure MCP Server extension is installed)
- [x] Build retrieval pipeline (query → tokenize → BM25 score → top-K → inject as `# Retrieved knowledge` block in system prompt)
- [x] MCP connectivity with graceful fallback (`discoverTools()` returns `[]` when extension is absent)
- [ ] Optional: dedicated `microsoft-docs` MCP server integration (currently covered by RAG over local docs)

### Week 6-7: Generators
- [x] Implement `adr-generator.ts` (LLM-driven, MADR template)
- [x] Implement `iac-generator.ts` (Bicep + Terraform, LLM-driven)
- [x] Implement `diagram-generator.ts` (Mermaid)
- [x] Implement `documentation-generator.ts` (overview, deployment runbook, IR runbook, glossary; wired into `/generate`)
- [ ] Integration tests for full artifact generation pipeline (deferred to Phase 3)

### Week 8: Validators
- [x] Implement `alz-validator.ts` (syntax + security/best-practice heuristics + scoring)
- [x] Integrate `az bicep build` for syntax validation - **plus Bicep extension `bicep.build` command as preferred path**
- [x] Integrate **Checkov** for security scanning (`ExtensionIntegrations.runCheckov`, JSON parsed, score deduction; skips silently when not on PATH)
- [x] `terraform validate` integration (`terraform init -backend=false` + `validate -no-color`, runs against `path.dirname(filePath)`)
- [x] Load validation rules from `validation/rules/*.json` (security.json + best-practices.json; bundled in VSIX, fallback to inline rules for tests)
- [ ] Test against 100 ALZ scenarios from evaluation dataset (deferred to Phase 3)

### Bonus Work (Beyond Original Plan)
- [x] **`/status` command** - reports companion extension install state, Azure CLI sign-in, MCP tool count
- [x] **`/deploy` command** - `az deployment sub create` end-to-end with Bicep build pre-check
- [x] **`ExtensionIntegrations` helper** - centralised proxy to Bicep extension, Azure CLI, Azure Resources, MCP
- [x] **`extensionDependencies` + `extensionPack`** - auto-installs Copilot Chat, Bicep, Azure MCP
- [x] **`.vscode/extensions.json`** - recommends 10 companion extensions to contributors
- [x] **VSIX packaging** - `alz-agent-1.0.0.vsix` (42.6 KB, lean via `.vscodeignore`; ships `validation/rules/`)
- [x] **Real LLM integration** via `vscode.lm` API (no API keys; uses user's Copilot entitlement)
- [x] **Tool-call loop** in `LlmService.streamChat()` - 5-round cap, handles `LanguageModelToolCallPart` end-to-end

### Exit Criteria
- ✅ All 7 phases executable end-to-end
- ⚠️ ≥80% unit test coverage **(coverage tooling not wired up; 12 tests passing)**
- 🔜 ≥90% accuracy on evaluation dataset **(deferred to Phase 3)**
- 🔜 ≥90/100 security scan score on generated IaC **(deferred to Phase 3)**

---

## 🧪 Phase 3: Testing & Validation (Weeks 9-10)

**Status**: 🔜 **PLANNED**

### Week 9: Automated Testing
- [ ] Expand unit test suite to ≥90% coverage
- [ ] Create 100 integration test scenarios covering:
  - Greenfield deployments (10 subscriptions, 50 subscriptions, 200+ subscriptions)
  - Brownfield migrations
  - Hub-Spoke vs Virtual WAN decision logic
  - Multi-region configurations
  - Compliance overlays (ISO 27001, SOC 2, HIPAA, PCI-DSS)
- [ ] Run full test suite in CI/CD (GitHub Actions)

### Week 10: User Acceptance Testing
- [ ] Alpha testing with 3-5 pilot users (architects, engineers)
- [ ] Collect feedback on:
  - Questionnaire clarity (Phase 1: Discovery)
  - Recommendation relevance (Phase 2: Design)
  - ADR quality (Phase 3: ADR)
  - IaC deployment success rate (Phase 5: IaC)
  - Documentation completeness (Phase 6: Documentation)
- [ ] Fix P0/P1 bugs
- [ ] Iterate on prompt templates based on feedback

### Exit Criteria
- ✅ ≥95% test pass rate
- ✅ ≥95% IaC deployment success in test subscriptions
- ✅ NPS ≥50 from pilot users

---

## 🚀 Phase 4: Beta Release (Weeks 11-14)

**Status**: 🔜 **PLANNED**

### Week 11-12: Beta Launch
- [ ] Package extension for VS Code Marketplace (private beta)
- [ ] Create onboarding video (5-10 minutes)
- [ ] Write quickstart guide
- [ ] Set up telemetry (usage analytics, error tracking)
- [ ] Beta release to 20-30 users

### Week 13-14: Iteration
- [ ] Monitor telemetry for:
  - Command usage frequency (`/design`, `/validate`, `/generate`, `/diagram`)
  - Average session duration
  - Phase completion rates
  - Error rates by phase
- [ ] Fix bugs based on beta feedback
- [ ] Optimize prompt templates for clarity
- [ ] Improve recommendation accuracy based on real-world scenarios

### Exit Criteria
- ✅ ≥100 active users
- ✅ ≥50 successful deployments
- ✅ ≥75% time reduction vs manual process
- ✅ NPS ≥60

---

## 🎯 Phase 5: General Availability (Weeks 15-20)

**Status**: 🔜 **PLANNED**

### Week 15-16: Final Hardening
- [ ] Security audit (penetration testing, dependency scanning)
- [ ] Performance optimization:
  - RAG retrieval latency ≤2s
  - ADR generation latency ≤3s
  - IaC generation latency ≤5s
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Localization (support for EN-US initially)

### Week 17-18: Documentation & Marketing
- [ ] Complete user documentation (docs.microsoft.com or equivalent)
- [ ] Create demo videos (landing zone scenarios)
- [ ] Write blog post for GA launch
- [ ] Prepare conference talk materials (Ignite, Build)

### Week 19: GA Launch
- [ ] Publish to VS Code Marketplace (public)
- [ ] Announce on social media, Microsoft Tech Community
- [ ] Monitor for P0 issues in first 48 hours

### Week 20: Post-Launch Support
- [ ] Bug triage and hotfix process
- [ ] Collect GitHub issues and feature requests
- [ ] Plan v1.1 roadmap based on user feedback

### Exit Criteria
- ✅ Public release on VS Code Marketplace
- ✅ ≥1,000 installs in first month
- ✅ ≥95% conformance to ALZ design principles
- ✅ NPS ≥70

---

## 🔮 Future Roadmap (v1.1 - v2.0)

### v1.1 (Q3 2026)
- **Brownfield Migration Support**: Analyze existing subscriptions, recommend migration path
- **Multi-Tenant**: Support for complex org structures (subsidiaries, acquisitions)
- **Cost Estimation**: Integrate Azure Pricing Calculator for TCO analysis
- **Compliance Deep Dive**: Automated control mapping for FedRAMP, GDPR

### v2.0 (Q4 2026)
- **Multi-Cloud**: Extend to AWS Landing Zones and GCP Organization Policies
- **AI-Powered Optimization**: Continuous improvement suggestions based on Azure Advisor
- **Collaboration**: Shared design sessions with real-time co-authoring
- **Integration**: Azure DevOps Boards sync, ServiceNow integration

---

## 📊 Success Metrics Dashboard

| Metric | Target | Status |
|--------|--------|--------|
| **Time Reduction** | 75% (4 weeks → 1 week) | 🔜 Not measured yet |
| **Conformance Score** | ≥95% (ALZ design principles) | 🔜 Not measured yet |
| **Deployment Success** | ≥95% (IaC templates deploy successfully) | 🔜 Not measured yet |
| **User Satisfaction (NPS)** | ≥70 at GA | 🔜 Not measured yet |
| **Recommendation Accuracy** | ≥90% (vs Microsoft FTE gold standard) | 🔜 Not measured yet |
| **Security Score** | ≥90/100 (checkov scan) | 🔜 Not measured yet |
| **Response Time** | ≤5s (average for recommendations) | 🔜 Not measured yet |

---

## 🛠️ Current Sprint

### Recently Shipped (commit `e20aa74`)
1. ✅ `DocumentationGenerator` - 4 LLM-grounded ops docs (overview, deployment runbook, IR runbook, glossary)
2. ✅ Real `terraform validate` via `ExtensionIntegrations.validateTerraform`
3. ✅ Checkov integration via `ExtensionIntegrations.runCheckov` (JSON parse, score deduction)
4. ✅ External rule files at `validation/rules/{security,best-practices}.json` (bundled in VSIX)
5. ✅ Tier 1 extension integration (`ExtensionIntegrations` helper)
6. ✅ `/status` and `/deploy` chat commands
7. ✅ Azure MCP tool calling via `vscode.lm.tools`
8. ✅ BM25 RAG over docs/prompts/workspace markdown

### Active Work Items (Phase 3 prep)
1. **Coverage tooling** - wire up `jest --coverage` and enforce ≥80% threshold
2. **Integration test suite** - end-to-end fixtures driving the full `/design` → `/generate` pipeline
3. **100-scenario evaluation dataset** - greenfield 10/50/200, brownfield, hub-spoke vs vWAN, compliance overlays
4. **CI/CD** - GitHub Actions workflow running `npm test`, `npm run compile`, `vsce package` on PR
5. **Optional**: dedicated `microsoft-docs` MCP server (currently covered by RAG over local docs)

### Blockers
- None

### Next Up
- Phase 3: 100-scenario evaluation dataset run
- Phase 4: Marketplace publish prep (publisher account, icon, gallery banner)

---

**Last Updated**: 2026-05-11 (Phase 2 closeout - commit `e20aa74`)  
**Maintained By**: ALZ Agent Team  
**Questions?** Open a [GitHub Discussion](https://github.com/SQLMiguel/ALZAgent/discussions)

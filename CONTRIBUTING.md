# Contributing to Landing Zone Provisioning Agent

Thank you for your interest in contributing to the ALZ Agent! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Visual Studio Code 1.85.0+
- Azure CLI 2.50.0+
- Git

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/SQLMiguel/ALZAgent.git
cd ALZAgent

# Install dependencies
npm install

# Build the extension
npm run compile

# Run tests
npm test
```

### Running Locally
Press F5 in VS Code to launch Extension Development Host with the agent loaded.

## Project Structure

```
ALZAgent/
├── .github/agents/        # Agent definition
├── src/                   # TypeScript source code
│   ├── agent/            # Core agent logic
│   ├── generators/       # ADR, IaC, diagram generators
│   ├── rag/              # RAG engine and MCP clients
│   └── validation/       # Validation and scanning
├── prompts/              # Prompt templates
├── validation/rules/     # Best practice rules
├── evaluation/           # Test scenarios and rubrics
└── docs/                 # Documentation
```

## Code Style

### TypeScript Guidelines
- Use TypeScript strict mode
- Follow ESLint rules (`npm run lint`)
- Format with Prettier (`npm run format`)
- Write JSDoc comments for public APIs
- Use async/await (avoid callbacks)

### Naming Conventions
- **Files**: kebab-case (`adr-generator.ts`)
- **Classes**: PascalCase (`ADRGenerator`)
- **Functions**: camelCase (`generateADR`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)

## Testing

### Writing Tests
- Place tests next to source files: `foo.ts` → `foo.test.ts`
- Use Jest for unit and integration tests
- Aim for ≥80% code coverage
- Mock MCP servers for deterministic tests

```typescript
// Example test
import { ADRGenerator } from './adr-generator';

describe('ADRGenerator', () => {
  it('should generate MADR-compliant ADR', async () => {
    const generator = new ADRGenerator();
    const adr = await generator.generate({
      title: 'Networking Topology',
      decision: 'Virtual WAN',
      context: 'Multi-region deployment'
    });
    
    expect(adr).toContain('# ADR-001: Networking Topology');
    expect(adr).toContain('## Decision');
    expect(adr).toContain('Virtual WAN');
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Pull Request Process

### Before Submitting
1. **Create an issue** describing the bug or feature
2. **Fork the repository** and create a branch from `main`
3. **Write tests** for new functionality
4. **Update documentation** if APIs change
5. **Run linter and tests**: `npm run lint && npm test`
6. **Build successfully**: `npm run build`

### PR Guidelines
- **Title**: Use conventional commits format: `feat: add diagram export` or `fix: handle MCP timeout`
- **Description**: Reference the issue (`Closes #123`) and explain changes
- **Commits**: Keep commits focused and atomic
- **Size**: Prefer small PRs (<500 lines changed)

### Conventional Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code refactor without behavior change
- `test`: Adding or updating tests
- `chore`: Build process or tooling changes

## Adding New Features

### Adding a New MCP Server
1. Define interface in `src/rag/mcp-client.ts`
2. Implement client methods
3. Add server config to `package.json` under `alz-agent.mcpServers`
4. Update documentation in `README.md`

### Adding a New Prompt Template
1. Create Markdown file in `prompts/alz-agent/`
2. Use `{{variable}}` syntax for placeholders
3. Add loading logic in `src/agent/handler.ts`
4. Write tests for template rendering

### Adding a New Validation Rule
1. Define rule in `validation/rules/` as JSON
2. Implement validator in `src/validation/`
3. Add to validation pipeline
4. Write test cases with pass/fail scenarios

## Documentation

### Code Documentation
- Write JSDoc comments for public APIs
- Include usage examples in comments
- Document complex algorithms

### User Documentation
- Update `README.md` for user-facing changes
- Add entries to `docs/faq.md` for common questions
- Update `docs/glossary.md` for new terms

## Evaluation and Quality

### Evaluation Dataset
- Add test scenarios to `evaluation/datasets/alz-scenarios.jsonl`
- Each scenario should have expected output (gold standard)
- Cover all 8 design areas

### Quality Metrics
Ensure your changes maintain:
- ≥90% recommendation accuracy
- ≥95% IaC deployment success
- 100% security compliance (zero critical vulnerabilities)

## Releasing

### Version Numbering
Follow Semantic Versioning (semver):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Process
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create GitHub release with tag (e.g., `v1.0.0`)
4. Build and publish to VS Code Marketplace

## Community

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Pull Requests**: Code contributions

### Code of Conduct
- Be respectful and inclusive
- Welcome newcomers and help them contribute
- Focus on constructive feedback
- Follow GitHub's Community Guidelines

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.

---

**Questions?** Open a [GitHub Discussion](https://github.com/SQLMiguel/ALZAgent/discussions) or reach out to maintainers.

Thank you for contributing! 🚀

# Getting Started with ALZ Agent Development

> **Quick start guide for contributors and developers**

## 📋 What You Have Now

✅ **Complete project scaffolding** including:
- Comprehensive PRD (107 story points of work defined)
- Agent definition with phase-based pipeline pattern
- Technical architecture with component diagrams
- TypeScript project structure (src/, prompts/, validation/)
- Sample implementation files (handler, phase-pipeline, conversation-manager)
- Testing framework (evaluation datasets, rubrics)
- Documentation (README, FAQ, glossary, CONTRIBUTING)

## 🎯 Next Steps

### 1. Install Dependencies

```bash
cd d:\Clients\ALZAgent
npm install
```

**Key dependencies to add** (not in package.json yet - add these manually):
```json
{
  "dependencies": {
    "vscode": "^1.85.0",
    "@vscode/copilot-chat": "^0.10.0",
    "@modelcontextprotocol/sdk": "^0.5.0",
    "langchain": "^0.1.0",
    "@langchain/openai": "^0.0.25",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^18.0.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.0",
    "ts-loader": "^9.5.0"
  }
}
```

### 2. Set Up VS Code Extension Development

**Launch Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "npm: compile"
    }
  ]
}
```

**Tasks** (`.vscode/tasks.json`):
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "compile",
      "problemMatcher": "$tsc",
      "isBackground": false,
      "label": "npm: compile"
    },
    {
      "type": "npm",
      "script": "watch",
      "problemMatcher": "$tsc-watch",
      "isBackground": true,
      "label": "npm: watch"
    }
  ]
}
```

### 3. Create Extension Entry Point

**`src/extension.ts`** (main entry point):
```typescript
import * as vscode from 'vscode';
import { ALZAgentHandler } from './agent/handler';

export function activate(context: vscode.ExtensionContext) {
  console.log('ALZ Agent is now active');

  // Register chat participant
  const handler = new ALZAgentHandler(context);
  const participant = vscode.chat.createChatParticipant('alz-agent.alz', handler.handleRequest.bind(handler));
  
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'icon.png');
  
  context.subscriptions.push(participant);
}

export function deactivate() {
  console.log('ALZ Agent deactivated');
}
```

### 4. Build and Test Locally

```bash
# Compile TypeScript
npm run compile

# Run in development mode (opens Extension Development Host)
# Press F5 in VS Code

# In the Extension Development Host, open a new folder
# Then invoke @alz in the chat panel
```

### 5. Implement Core Components (Priority Order)

#### Week 1: Agent Core
1. **handler.ts** - Already scaffolded; add LLM integration
2. **phase-pipeline.ts** - Already scaffolded; add gate validation logic
3. **conversation-manager.ts** - Already scaffolded; add persistence
4. Write unit tests for state management

#### Week 2: RAG Engine
1. **rag-engine.ts**:
   ```typescript
   import { OpenAIEmbeddings } from '@langchain/openai';
   import { MemoryVectorStore } from 'langchain/vectorstores/memory';
   
   export class RAGEngine {
     private vectorStore: MemoryVectorStore;
     
     async retrieve(query: string, topK: number = 5): Promise<any[]> {
       const results = await this.vectorStore.similaritySearch(query, topK);
       return results;
     }
   }
   ```

2. **mcp-client.ts** (MCP server integration):
   ```typescript
   import { Client } from '@modelcontextprotocol/sdk/client/index.js';
   import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
   
   export class MCPClient {
     private client: Client;
     
     async connect(serverPath: string) {
       const transport = new StdioClientTransport({
         command: 'node',
         args: [serverPath]
       });
       
       this.client = new Client({
         name: 'alz-agent',
         version: '1.0.0'
       }, { capabilities: {} });
       
       await this.client.connect(transport);
     }
     
     async callTool(name: string, args: any) {
       return await this.client.callTool({ name, arguments: args });
     }
   }
   ```

#### Week 3: Generators
1. **adr-generator.ts** - Generate MADR-compliant ADRs
2. **iac-generator.ts** - Generate Bicep/Terraform
3. **diagram-generator.ts** - Generate Mermaid diagrams

#### Week 4: Validators
1. **alz-validator.ts** - Syntax + security + best practices
2. Integrate checkov, az bicep build, terraform validate

### 6. Testing Strategy

**Unit Tests** (`src/**/*.test.ts`):
```typescript
import { PhasePipeline, Phase } from './phase-pipeline';

describe('PhasePipeline', () => {
  it('should transition to Discovery phase', async () => {
    const pipeline = new PhasePipeline();
    const session = { currentPhase: null };
    
    const result = await pipeline.transitionTo(Phase.DISCOVERY, session);
    
    expect(result).toBe(true);
    expect(session.currentPhase).toBe(Phase.DISCOVERY);
  });
});
```

**Integration Tests** (`evaluation/integration-tests.ts`):
```typescript
import { ALZAgentHandler } from '../src/agent/handler';

describe('End-to-End Flow', () => {
  it('should complete full design workflow', async () => {
    const handler = new ALZAgentHandler(mockContext);
    
    // Phase 1: Discovery
    await handler.handleRequest(mockRequest('/design'), ...);
    // ... provide requirements
    
    // Phase 5: IaC Generation
    await handler.handleRequest(mockRequest('/generate'), ...);
    
    // Validate IaC files created
    expect(fs.existsSync('infrastructure/bicep/main.bicep')).toBe(true);
  });
});
```

### 7. Configure MCP Servers

**Add to VS Code settings** (`settings.json`):
```json
{
  "alz-agent.mcpServers": {
    "microsoft-docs": {
      "command": "npx",
      "args": ["-y", "@microsoft/mcp-server-docs"]
    },
    "azure": {
      "command": "npx",
      "args": ["-y", "@microsoft/mcp-server-azure"]
    },
    "bicep": {
      "command": "npx",
      "args": ["-y", "@microsoft/mcp-server-bicep"]
    }
  }
}
```

### 8. Add Prompt Templates

Create prompt templates in `prompts/alz-agent/`:

**discovery.md**:
```markdown
# Landing Zone Requirements Discovery

I'll ask you a series of questions to understand your Azure Landing Zone needs.

## Section 1: Scale & Scope
- How many Azure subscriptions do you expect in the next 12 months?
- Which Azure regions will you deploy to?
...
```

**decision-tree-networking.md**:
```markdown
# Networking Topology Decision Tree

Based on your requirements:
- Subscription count: {{subscriptionCount}}
- Regions: {{regions}}

## Analysis
{{#if (gte subscriptionCount 50)}}
Recommendation: Virtual WAN
Rationale: At 50+ subscriptions across multiple regions, Virtual WAN provides...
{{else}}
Recommendation: Hub-Spoke
Rationale: For smaller deployments, Hub-Spoke offers...
{{/if}}
```

### 9. Debugging Tips

**Enable logging**:
```typescript
// In handler.ts
const outputChannel = vscode.window.createOutputChannel('ALZ Agent');
outputChannel.appendLine('[DEBUG] User request: ' + request.prompt);
```

**View logs**:
- Output panel → "ALZ Agent"
- Developer Tools (Help → Toggle Developer Tools) → Console

**Test without VS Code**:
```bash
# Run unit tests in isolation
npm test -- --watch
```

### 10. Release Checklist

Before publishing to VS Code Marketplace:
- [ ] ≥80% test coverage
- [ ] No ESLint errors
- [ ] README.md complete with screenshots
- [ ] CHANGELOG.md created
- [ ] Icon and banner images added
- [ ] `vsce package` builds successfully
- [ ] Extension tested in clean VS Code instance

## 📚 Key Resources

- **PRD**: `docs/artifacts/prd/PRD-ALZ-Agent.md` - Full requirements
- **Agent Definition**: `.github/agents/alz-agent.agent.md` - Phase pipeline
- **Technical Architecture**: `docs/architecture/technical-architecture.md` - System design
- **Roadmap**: `ROADMAP.md` - 20-week plan to GA
- **FAQ**: `docs/faq.md` - Common questions

## 🤝 Getting Help

- **GitHub Issues**: Report bugs or request features
- **Contributing Guide**: See `CONTRIBUTING.md`

## 🚀 Success Criteria

Your agent is working when:
1. ✅ You can invoke `@alz` in VS Code chat
2. ✅ `/design` command starts requirements questionnaire
3. ✅ `/generate` creates ADR files in `docs/architecture/decisions/`
4. ✅ `/generate` creates Bicep/Terraform in `infrastructure/`
5. ✅ `/validate` runs security scans and reports scores
6. ✅ `/diagram` generates Mermaid diagrams

---

**Ready to build?** Start with `npm install` and then implement `src/extension.ts` as your entry point!

Good luck! 🎉

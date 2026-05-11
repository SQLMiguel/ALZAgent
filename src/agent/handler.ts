/**
 * Main agent handler for ALZ Agent
 * Entry point for @alz chat participant in VS Code
 */

import * as vscode from 'vscode';
import { ConversationManager } from './conversation-manager';
import { PhasePipeline, Phase } from './phase-pipeline';
import { RAGEngine } from '../rag/rag-engine';
import { ADRGenerator } from '../generators/adr-generator';
import { IaCGenerator } from '../generators/iac-generator';
import { DiagramGenerator } from '../generators/diagram-generator';
import { ALZValidator } from '../validation/alz-validator';

export class ALZAgentHandler {
  private conversationManager: ConversationManager;
  private phasePipeline: PhasePipeline;
  private ragEngine: RAGEngine;
  private adrGenerator: ADRGenerator;
  private iacGenerator: IaCGenerator;
  private diagramGenerator: DiagramGenerator;
  private validator: ALZValidator;

  constructor(context: vscode.ExtensionContext) {
    // Initialize components
    this.conversationManager = new ConversationManager(context);
    this.phasePipeline = new PhasePipeline();
    this.ragEngine = new RAGEngine();
    this.adrGenerator = new ADRGenerator();
    this.iacGenerator = new IaCGenerator();
    this.diagramGenerator = new DiagramGenerator();
    this.validator = new ALZValidator();
  }

  /**
   * Handle incoming chat request
   */
  async handleRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    // Load conversation state (ChatContext does not expose a stable sessionId in current API)
    const session = await this.conversationManager.loadSession('default');
    
    // Route based on command or default to conversational
    const command = request.command;
    
    try {
      if (command === 'design') {
        await this.handleDesignCommand(request, session, stream, token);
      } else if (command === 'validate') {
        await this.handleValidateCommand(request, session, stream, token);
      } else if (command === 'generate') {
        await this.handleGenerateCommand(request, session, stream, token);
      } else if (command === 'diagram') {
        await this.handleDiagramCommand(request, session, stream, token);
      } else {
        await this.handleConversation(request, session, stream, token);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stream.markdown(`❌ Error: ${message}`);
      console.error('[ALZ Agent] Error:', error);
    } finally {
      // Persist conversation state
      await this.conversationManager.saveSession(session);
    }
  }

  /**
   * /design command: Interactive design questionnaire
   */
  private async handleDesignCommand(
    request: vscode.ChatRequest,
    session: any,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('## 🏗️ Landing Zone Design Assistant\n\n');
    stream.markdown('I\'ll help you design your Azure Landing Zone architecture. Let\'s gather requirements.\n\n');
    
    // Phase 1: Requirements Discovery
    await this.phasePipeline.transitionTo(Phase.DISCOVERY, session);
    
    const questions = await this.loadPromptTemplate('discovery.md');
    stream.markdown(questions);
    
    // TODO: Implement multi-turn questionnaire
  }

  /**
   * /validate command: Validate IaC templates
   */
  private async handleValidateCommand(
    request: vscode.ChatRequest,
    session: any,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('## ✅ Validation\n\n');
    
    // Find IaC files in workspace
    const iacFiles = await vscode.workspace.findFiles('**/*.{bicep,tf}', '**/node_modules/**');
    
    if (iacFiles.length === 0) {
      stream.markdown('⚠️ No IaC files found in workspace. Please generate templates first.\n');
      return;
    }
    
    stream.markdown(`Found ${iacFiles.length} IaC files. Validating...\n\n`);
    
    // Validate each file
    for (const file of iacFiles) {
      const results = await this.validator.validate(file.fsPath);
      stream.markdown(`### ${file.fsPath}\n`);
      stream.markdown(`- Security Score: ${results.securityScore}/100\n`);
      stream.markdown(`- Syntax: ${results.syntaxValid ? '✅' : '❌'}\n`);
      stream.markdown(`- Best Practices: ${results.bestPracticesScore}/100\n\n`);
    }
  }

  /**
   * /generate command: Generate ADRs and IaC
   */
  private async handleGenerateCommand(
    request: vscode.ChatRequest,
    session: any,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('## 📝 Generate Artifacts\n\n');
    
    if (!session.requirements || Object.keys(session.requirements).length === 0) {
      stream.markdown('⚠️ No requirements captured yet. Use `/design` first.\n');
      return;
    }
    
    // Generate ADRs
    stream.markdown('### Generating Architecture Decision Records...\n');
    const adrs = await this.adrGenerator.generateFromRequirements(session.requirements);
    
    for (const adr of adrs) {
      const filePath = `docs/architecture/decisions/${adr.id}.md`;
      await this.writeFile(filePath, adr.content);
      stream.markdown(`- ✅ Created [${adr.id}](${filePath})\n`);
    }
    
    // Generate IaC
    stream.markdown('\n### Generating Infrastructure-as-Code...\n');
    const iacFormat = vscode.workspace.getConfiguration('alz-agent').get('preferredIaC') as string;
    const templates = await this.iacGenerator.generate(session.requirements, iacFormat);
    
    for (const template of templates) {
      const dirPath = iacFormat === 'bicep' ? 'infrastructure/bicep' : 'infrastructure/terraform';
      const filePath = `${dirPath}/${template.filename}`;
      await this.writeFile(filePath, template.content);
      stream.markdown(`- ✅ Created [${template.filename}](${filePath})\n`);
    }
  }

  /**
   * /diagram command: Generate architecture diagrams
   */
  private async handleDiagramCommand(
    request: vscode.ChatRequest,
    session: any,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('## 📊 Generate Diagrams\n\n');
    
    if (!session.requirements) {
      stream.markdown('⚠️ No requirements captured yet. Use `/design` first.\n');
      return;
    }
    
    const diagrams = await this.diagramGenerator.generate(session.requirements);
    
    for (const diagram of diagrams) {
      const filePath = `docs/architecture/diagrams/${diagram.name}.mmd`;
      await this.writeFile(filePath, diagram.mermaidCode);
      stream.markdown(`### ${diagram.title}\n\n`);
      stream.markdown('```mermaid\n' + diagram.mermaidCode + '\n```\n\n');
    }
  }

  /**
   * Conversational mode: RAG-based Q&A
   */
  private async handleConversation(
    request: vscode.ChatRequest,
    session: any,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    const userMessage = request.prompt;
    
    // Retrieve relevant context from MCP servers
    const context = await this.ragEngine.retrieve(userMessage, session);
    
    // Generate response (would call LLM here)
    const response = await this.generateResponse(userMessage, context, session);
    
    stream.markdown(response);
  }

  /**
   * Clear the current session (invoked from alz-agent.clearSession command)
   */
  async clearSession(): Promise<void> {
    await this.conversationManager.clearSession();
  }

  /**
   * Load prompt template
   */
  private async loadPromptTemplate(filename: string): Promise<string> {
    const uri = vscode.Uri.file(`prompts/alz-agent/${filename}`);
    const content = await vscode.workspace.fs.readFile(uri);
    return content.toString();
  }

  /**
   * Write file to workspace
   */
  private async writeFile(relativePath: string, content: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }
    
    const uri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
  }

  /**
   * Generate response (placeholder - would use Copilot API)
   */
  private async generateResponse(
    message: string,
    context: any,
    session: any
  ): Promise<string> {
    // TODO: Integrate with vscode.lm.sendRequest or Copilot Chat API
    return 'Response generation not yet implemented';
  }
}

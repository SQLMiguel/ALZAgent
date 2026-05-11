/**
 * Main agent handler for ALZ Agent
 * Entry point for @alz chat participant in VS Code
 */

import * as vscode from 'vscode';
import { ConversationManager, Session } from './conversation-manager';
import { PhasePipeline, Phase } from './phase-pipeline';
import { LlmService, ChatTurn } from './llm-service';
import { RAGEngine } from '../rag/rag-engine';
import { ADRGenerator } from '../generators/adr-generator';
import { IaCGenerator } from '../generators/iac-generator';
import { DiagramGenerator } from '../generators/diagram-generator';
import { ALZValidator } from '../validation/alz-validator';

export class ALZAgentHandler {
  private conversationManager: ConversationManager;
  private phasePipeline: PhasePipeline;
  private llm: LlmService;
  private ragEngine: RAGEngine;
  private adrGenerator: ADRGenerator;
  private iacGenerator: IaCGenerator;
  private diagramGenerator: DiagramGenerator;
  private validator: ALZValidator;
  private extensionUri: vscode.Uri;
  private systemPromptCache?: string;

  constructor(context: vscode.ExtensionContext) {
    this.extensionUri = context.extensionUri;
    this.conversationManager = new ConversationManager(context);
    this.phasePipeline = new PhasePipeline();
    this.llm = new LlmService();
    this.ragEngine = new RAGEngine();
    this.adrGenerator = new ADRGenerator();
    this.iacGenerator = new IaCGenerator();
    this.diagramGenerator = new DiagramGenerator();
    this.validator = new ALZValidator();
  }

  async handleRequest(
    request: vscode.ChatRequest,
    _context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    const session = await this.conversationManager.loadSession('default');
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
      stream.markdown(`\u274c Error: ${message}`);
      console.error('[ALZ Agent] Error:', error);
    } finally {
      await this.conversationManager.saveSession(session);
    }
  }

  private async handleDesignCommand(
    request: vscode.ChatRequest,
    session: Session,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    await this.phasePipeline.transitionTo(Phase.DISCOVERY, session);

    const questions = await this.loadPromptTemplate('discovery.md');
    stream.markdown(questions);
    this.conversationManager.appendMessage(session, 'assistant', questions);

    if (request.prompt && request.prompt.trim().length > 0) {
      stream.markdown('\n\n---\n\n');
      await this.handleConversation(request, session, stream, token);
    }
  }

  private async handleValidateCommand(
    _request: vscode.ChatRequest,
    _session: Session,
    stream: vscode.ChatResponseStream,
    _token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('## \u2705 Validation\n\n');

    const iacFiles = await vscode.workspace.findFiles('**/*.{bicep,tf}', '**/node_modules/**');
    if (iacFiles.length === 0) {
      stream.markdown('\u26a0\ufe0f No IaC files found in workspace. Use `/generate` first.\n');
      return;
    }

    stream.markdown(`Found ${iacFiles.length} IaC files. Validating...\n\n`);
    for (const file of iacFiles) {
      const results = await this.validator.validate(file.fsPath);
      stream.markdown(`### ${vscode.workspace.asRelativePath(file)}\n`);
      stream.markdown(`- Security Score: ${results.securityScore}/100\n`);
      stream.markdown(`- Syntax: ${results.syntaxValid ? '\u2705' : '\u274c'}\n`);
      stream.markdown(`- Best Practices: ${results.bestPracticesScore}/100\n\n`);
    }
  }

  private async handleGenerateCommand(
    _request: vscode.ChatRequest,
    session: Session,
    stream: vscode.ChatResponseStream,
    _token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('## \ud83d\udcdd Generate Artifacts\n\n');

    if (!session.requirements || Object.keys(session.requirements).length === 0) {
      stream.markdown('\u26a0\ufe0f No requirements captured yet. Use `/design` first.\n');
      return;
    }

    stream.markdown('### Generating Architecture Decision Records...\n');
    const adrs = await this.adrGenerator.generateFromRequirements(session.requirements);
    for (const adr of adrs) {
      const filePath = `docs/architecture/decisions/${adr.id}.md`;
      await this.writeFile(filePath, adr.content);
      stream.markdown(`- \u2705 Created [${adr.id}](${filePath})\n`);
    }

    stream.markdown('\n### Generating Infrastructure-as-Code...\n');
    const iacFormat =
      vscode.workspace.getConfiguration('alz-agent').get<string>('preferredIaC') ?? 'bicep';
    const templates = await this.iacGenerator.generate(session.requirements, iacFormat);
    for (const template of templates) {
      const dirPath = iacFormat === 'bicep' ? 'infrastructure/bicep' : 'infrastructure/terraform';
      const filePath = `${dirPath}/${template.filename}`;
      await this.writeFile(filePath, template.content);
      stream.markdown(`- \u2705 Created [${template.filename}](${filePath})\n`);
    }
  }

  private async handleDiagramCommand(
    _request: vscode.ChatRequest,
    session: Session,
    stream: vscode.ChatResponseStream,
    _token: vscode.CancellationToken
  ): Promise<void> {
    stream.markdown('## \ud83d\udcca Generate Diagrams\n\n');

    if (!session.requirements) {
      stream.markdown('\u26a0\ufe0f No requirements captured yet. Use `/design` first.\n');
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
   * Conversational mode: real LLM-backed Q&A with persistent history.
   */
  private async handleConversation(
    request: vscode.ChatRequest,
    session: Session,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> {
    const userMessage = request.prompt;
    if (!userMessage || userMessage.trim().length === 0) {
      stream.markdown(
        'Hi - I am the **Landing Zone Provisioning Agent**. ' +
          'Try `@alz /design` to start a landing zone design, ' +
          'or ask me any question about Azure Enterprise-Scale Landing Zones.'
      );
      return;
    }

    const systemPrompt = await this.getSystemPrompt();
    const history: ChatTurn[] = this.conversationManager
      .getRecentContext(session, 10)
      .map((m: { role: 'user' | 'assistant'; content: string }) => ({
        role: m.role,
        content: m.content,
      }));

    this.conversationManager.appendMessage(session, 'user', userMessage);

    // RAG hook - currently a no-op stub but reserved for retrieval grounding.
    void this.ragEngine.retrieve(userMessage, session);

    const assistantText = await this.llm.streamChat(
      systemPrompt,
      history,
      userMessage,
      stream,
      token
    );

    if (assistantText.length > 0) {
      this.conversationManager.appendMessage(session, 'assistant', assistantText);
    }
  }

  async clearSession(): Promise<void> {
    await this.conversationManager.clearSession();
  }

  private async loadPromptTemplate(filename: string): Promise<string> {
    const uri = vscode.Uri.joinPath(this.extensionUri, 'prompts', 'alz-agent', filename);
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder('utf-8').decode(bytes);
  }

  private async getSystemPrompt(): Promise<string> {
    if (!this.systemPromptCache) {
      this.systemPromptCache = await this.loadPromptTemplate('system.md');
    }
    return this.systemPromptCache;
  }

  private async writeFile(relativePath: string, content: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }
    const uri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);

    const parent = vscode.Uri.joinPath(uri, '..');
    try {
      await vscode.workspace.fs.createDirectory(parent);
    } catch {
      // ignore
    }
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
  }
}

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
    this.adrGenerator = new ADRGenerator(this.llm);
    this.iacGenerator = new IaCGenerator(this.llm);
    this.diagramGenerator = new DiagramGenerator(this.llm);
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

    const userInput = (request.prompt ?? '').trim();

    if (userInput.length === 0) {
      // First /design call - present the questionnaire.
      const questions = await this.loadPromptTemplate('discovery.md');
      stream.markdown(questions);
      this.conversationManager.appendMessage(session, 'assistant', questions);
      return;
    }

    // User provided answers - extract structured requirements then synthesise.
    stream.markdown('## \ud83d\udcdd Capturing requirements...\n\n');
    const extracted = await this.extractRequirements(userInput, session, token);
    if (extracted) {
      session.requirements = { ...session.requirements, ...extracted };
      stream.markdown(
        '\u2705 Requirements captured. Run `@alz /generate` to produce ADRs ' +
          'and IaC, or `@alz /diagram` for architecture diagrams.\n\n---\n\n'
      );
    } else {
      stream.markdown(
        '\u26a0\ufe0f Could not parse structured requirements; continuing in ' +
          'conversational mode.\n\n---\n\n'
      );
    }

    await this.handleConversation(request, session, stream, token);
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
    const adrs = await this.adrGenerator.generateFromRequirements(
      session.requirements,
      _token
    );
    for (const adr of adrs) {
      const filePath = `docs/architecture/decisions/${adr.id}.md`;
      await this.writeFile(filePath, adr.content);
      stream.markdown(`- \u2705 Created [${adr.id}](${filePath})\n`);
    }

    stream.markdown('\n### Generating Infrastructure-as-Code...\n');
    const iacFormat =
      vscode.workspace.getConfiguration('alz-agent').get<string>('preferredIaC') ?? 'bicep';
    const templates = await this.iacGenerator.generate(
      session.requirements,
      iacFormat,
      _token
    );
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

    const diagrams = await this.diagramGenerator.generate(session.requirements, _token);
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

  /**
   * Use the LLM to extract structured requirements from a free-text user
   * answer to the discovery questionnaire. Returns null if the LLM is
   * unavailable or the response cannot be parsed as JSON.
   */
  private async extractRequirements(
    userInput: string,
    _session: Session,
    token: vscode.CancellationToken
  ): Promise<Record<string, unknown> | null> {
    const systemPrompt =
      'You are an information-extraction tool. Read the user message containing ' +
      'answers to an Azure Landing Zone discovery questionnaire and emit ONLY ' +
      'a single JSON object inside a ```json fenced block. No commentary outside ' +
      'the fence. Use null for unanswered fields.';

    const userPrompt =
      `# Schema (use exactly these top-level keys; nested objects are fine)\n` +
      `{\n` +
      `  "organisation": { "name": string|null, "tenant": string|null },\n` +
      `  "scale": { "subscriptions": number|null, "workloads": number|null, "regions": string[]|null },\n` +
      `  "compliance": string[]|null,\n` +
      `  "identity": { "tenant": "existing"|"new"|null, "hybrid": boolean|null, "pim": boolean|null, "external": string[]|null },\n` +
      `  "network": { "topology": "hub-spoke"|"virtual-wan"|"unsure"|null, "hybrid": "expressroute"|"vpn-site-to-site"|"both"|null, "dns": string|null, "egress": string|null, "addressSpaces": string[]|null },\n` +
      `  "security": { "defenderPlans": string[]|null, "sentinel": boolean|null, "cmk": boolean|null, "tags": string[]|null, "diagnosticsDestination": string|null },\n` +
      `  "platform": { "subscriptionModel": string|null, "archetypes": string[]|null, "workloads": string[]|null },\n` +
      `  "ops": { "iac": "bicep"|"terraform"|null, "pipeline": string|null, "promotion": string|null, "budget": string|null }\n` +
      `}\n\n` +
      `# User answers\n${userInput}`;

    const raw = await this.llm.complete(systemPrompt, userPrompt, token);
    if (raw.trim().length === 0) {
      return null;
    }
    const json = LlmService.extractCodeBlock(raw, 'json');
    try {
      return JSON.parse(json) as Record<string, unknown>;
    } catch (err) {
      console.error('[ALZ Agent] Could not parse extracted requirements:', err);
      return null;
    }
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

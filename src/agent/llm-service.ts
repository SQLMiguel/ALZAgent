/**
 * LLM Service
 * Wraps the VS Code Language Model API (vscode.lm) so the agent can use
 * the user's GitHub Copilot model entitlement without any API keys.
 */

import * as vscode from 'vscode';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export class LlmService {
  /** Family priority - first available wins. */
  private static readonly MODEL_PREFERENCE = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];

  /**
   * Pick the best available Copilot chat model.
   * Returns undefined if the user has no Copilot entitlement or has not
   * yet consented to language-model access.
   */
  async selectModel(): Promise<vscode.LanguageModelChat | undefined> {
    for (const family of LlmService.MODEL_PREFERENCE) {
      const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family });
      if (models.length > 0) {
        return models[0];
      }
    }
    // Fallback: any Copilot model
    const any = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    return any[0];
  }

  /**
   * Discover Language Model Tools registered by other extensions, optionally
   * filtered by a tag (e.g. "azure-mcp"). Tools become available to the model
   * via tool calling.
   *
   * @param tag Optional tag filter. If omitted, returns all tools.
   */
  discoverTools(tag?: string): vscode.LanguageModelChatTool[] {
    const all = vscode.lm.tools ?? [];
    const filtered = tag
      ? all.filter((t) => t.tags?.includes(tag))
      : all;
    return filtered.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }

  /**
   * Stream a chat completion with tool-calling support. The model may call
   * any of the supplied tools; this method invokes them and feeds the results
   * back, looping until the model produces a final text response (no more
   * tool calls) or the iteration limit is reached.
   *
   * @param systemPrompt System / instructional prompt.
   * @param history     Prior conversation turns.
   * @param userMessage Latest user message.
   * @param tools       Tools the model may call (use discoverTools()).
   * @param stream      Chat response stream for streaming output.
   * @param token       Cancellation token.
   * @param maxRounds   Maximum tool-call rounds (safety cap; default 5).
   * @returns The final assistant text.
   */
  async streamChat(
    systemPrompt: string,
    history: ChatTurn[],
    userMessage: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    tools: vscode.LanguageModelChatTool[] = [],
    maxRounds = 5
  ): Promise<string> {
    const model = await this.selectModel();
    if (!model) {
      const msg =
        'No GitHub Copilot chat model is available. Sign in to GitHub Copilot ' +
        'and ensure the Copilot Chat extension is installed and enabled.';
      stream.markdown(`\u26a0\ufe0f ${msg}`);
      return '';
    }

    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      ...history.map((turn) =>
        turn.role === 'user'
          ? vscode.LanguageModelChatMessage.User(turn.content)
          : vscode.LanguageModelChatMessage.Assistant(turn.content)
      ),
      vscode.LanguageModelChatMessage.User(userMessage),
    ];

    const requestOptions: vscode.LanguageModelChatRequestOptions = {};
    if (tools.length > 0) {
      requestOptions.tools = tools;
    }

    let fullText = '';
    try {
      for (let round = 0; round < maxRounds; round++) {
        if (token.isCancellationRequested) {
          break;
        }

        const response = await model.sendRequest(messages, requestOptions, token);

        const toolCalls: vscode.LanguageModelToolCallPart[] = [];
        let assistantText = '';

        for await (const part of response.stream) {
          if (token.isCancellationRequested) {
            break;
          }
          if (part instanceof vscode.LanguageModelTextPart) {
            stream.markdown(part.value);
            assistantText += part.value;
          } else if (part instanceof vscode.LanguageModelToolCallPart) {
            toolCalls.push(part);
          }
        }

        fullText += assistantText;

        // No tool calls => model is done.
        if (toolCalls.length === 0) {
          return fullText;
        }

        // Echo the assistant's text + tool calls back into history.
        const assistantParts: Array<
          vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart
        > = [];
        if (assistantText.length > 0) {
          assistantParts.push(new vscode.LanguageModelTextPart(assistantText));
        }
        assistantParts.push(...toolCalls);
        messages.push(vscode.LanguageModelChatMessage.Assistant(assistantParts));

        // Execute each tool call and append the result.
        for (const call of toolCalls) {
          stream.progress(`Calling tool: ${call.name}`);
          let resultParts: vscode.LanguageModelToolResultPart;
          try {
            const result = await vscode.lm.invokeTool(
              call.name,
              { input: call.input, toolInvocationToken: undefined },
              token
            );
            const textParts = result.content
              .filter((p): p is vscode.LanguageModelTextPart =>
                p instanceof vscode.LanguageModelTextPart
              )
              .map((p) => p.value)
              .join('\n');
            resultParts = new vscode.LanguageModelToolResultPart(call.callId, [
              new vscode.LanguageModelTextPart(
                textParts.length > 0 ? textParts : '(tool returned no text content)'
              ),
            ]);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            resultParts = new vscode.LanguageModelToolResultPart(call.callId, [
              new vscode.LanguageModelTextPart(`Tool error: ${message}`),
            ]);
          }
          messages.push(vscode.LanguageModelChatMessage.User([resultParts]));
        }
      }
      stream.markdown(
        `\n\n_(Reached ${maxRounds}-round tool-call limit; stopping.)_\n`
      );
    } catch (err) {
      if (err instanceof vscode.LanguageModelError) {
        stream.markdown(`\u26a0\ufe0f Language model error: ${err.message}`);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        stream.markdown(`\u26a0\ufe0f Unexpected error: ${message}`);
      }
    }
    return fullText;
  }

  /**
   * Non-streaming completion. Used by generators that need the full response
   * before parsing (JSON extraction, file content production).
   *
   * @param systemPrompt The system / instructional prompt.
   * @param userPrompt   The user request.
   * @param token        Cancellation token.
   * @returns The full assistant response, or '' if no model is available.
   */
  async complete(
    systemPrompt: string,
    userPrompt: string,
    token: vscode.CancellationToken
  ): Promise<string> {
    const model = await this.selectModel();
    if (!model) {
      return '';
    }
    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt),
    ];
    let full = '';
    try {
      const response = await model.sendRequest(messages, {}, token);
      for await (const fragment of response.text) {
        if (token.isCancellationRequested) {
          break;
        }
        full += fragment;
      }
    } catch (err) {
      console.error('[LlmService.complete] error:', err);
    }
    return full;
  }

  /**
   * Extract the first fenced code block of a given language from text.
   * Falls back to the first fenced block of any language, then to the raw
   * input. Useful when the model wraps JSON / Bicep / Mermaid in fences.
   */
  static extractCodeBlock(text: string, language?: string): string {
    if (language) {
      const tagged = new RegExp('```' + language + '\\s*\\n([\\s\\S]*?)```', 'i');
      const m = text.match(tagged);
      if (m) {
        return m[1].trim();
      }
    }
    const any = text.match(/```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)```/);
    if (any) {
      return any[1].trim();
    }
    return text.trim();
  }
}

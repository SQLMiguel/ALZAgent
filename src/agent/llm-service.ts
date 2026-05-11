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
   * Stream a chat completion into the chat response stream.
   *
   * @param systemPrompt The system / instructional prompt for the agent.
   * @param history     Prior turns in the conversation (oldest first).
   * @param userMessage The latest user message.
   * @param stream      The chat response stream to write tokens into.
   * @param token       Cancellation token from the chat request.
   * @returns The full assistant response text (after streaming completes).
   */
  async streamChat(
    systemPrompt: string,
    history: ChatTurn[],
    userMessage: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
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
      // System prompt is sent as a User message because the stable API does
      // not yet expose a System role; Copilot treats the first User turn as
      // instructional context.
      vscode.LanguageModelChatMessage.User(systemPrompt),
      ...history.map((turn) =>
        turn.role === 'user'
          ? vscode.LanguageModelChatMessage.User(turn.content)
          : vscode.LanguageModelChatMessage.Assistant(turn.content)
      ),
      vscode.LanguageModelChatMessage.User(userMessage),
    ];

    let full = '';
    try {
      const response = await model.sendRequest(messages, {}, token);
      for await (const fragment of response.text) {
        if (token.isCancellationRequested) {
          break;
        }
        stream.markdown(fragment);
        full += fragment;
      }
    } catch (err) {
      if (err instanceof vscode.LanguageModelError) {
        stream.markdown(`\u26a0\ufe0f Language model error: ${err.message}`);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        stream.markdown(`\u26a0\ufe0f Unexpected error: ${message}`);
      }
    }
    return full;
  }
}

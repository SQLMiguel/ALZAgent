/**
 * Mock vscode module for Jest unit tests
 */

export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    append: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn()
  }))
};

export const workspace = {
  workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key: string) => {
      const defaults: Record<string, any> = {
        preferredIaC: 'bicep',
        validationLevel: 'standard',
        enableTelemetry: false
      };
      return defaults[key];
    })
  })),
  findFiles: jest.fn(() => Promise.resolve([])),
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    createDirectory: jest.fn()
  }
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn()
};

export const chat = {
  createChatParticipant: jest.fn()
};

export class Uri {
  constructor(public fsPath: string) {}
  static file(path: string): Uri { return new Uri(path); }
  static joinPath(base: Uri, ...segments: string[]): Uri {
    return new Uri([base.fsPath, ...segments].join('/'));
  }
}

export class ThemeIcon {
  constructor(public id: string) {}
}

export const lm = {
  selectChatModels: jest.fn(() => Promise.resolve([])),
  tools: [] as any[],
  invokeTool: jest.fn(() => Promise.resolve({ content: [] }))
};

export class LanguageModelChatMessage {
  constructor(public role: number, public content: any) {}
  static User(content: any): LanguageModelChatMessage {
    return new LanguageModelChatMessage(1, content);
  }
  static Assistant(content: any): LanguageModelChatMessage {
    return new LanguageModelChatMessage(2, content);
  }
}

export class LanguageModelError extends Error {
  constructor(message: string) { super(message); }
}

export class LanguageModelTextPart {
  constructor(public value: string) {}
}

export class LanguageModelToolCallPart {
  constructor(public callId: string, public name: string, public input: any) {}
}

export class LanguageModelToolResultPart {
  constructor(public callId: string, public content: any[]) {}
}

export enum LanguageModelChatToolMode {
  Auto = 1,
  Required = 2
}

export enum ChatResponseStream {}

export const ExtensionContext = jest.fn();
export const CancellationToken = jest.fn();

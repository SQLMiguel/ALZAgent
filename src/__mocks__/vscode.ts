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

export enum ChatResponseStream {}

export const ExtensionContext = jest.fn();
export const CancellationToken = jest.fn();

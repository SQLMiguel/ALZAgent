/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/extension.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  // Floor locked at current baseline. Ratchet upward as new tests land.
  // Phase 3 target: 80% statements / 70% branches.
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 15,
      lines: 10,
      statements: 10
    }
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__mocks__/vscode.ts'
  }
};

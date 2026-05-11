export interface ValidationResult {
  securityScore: number;
  syntaxValid: boolean;
  bestPracticesScore: number;
  issues: string[];
}

export class ALZValidator {
  async validate(_filePath: string): Promise<ValidationResult> {
    return {
      securityScore: 0,
      syntaxValid: false,
      bestPracticesScore: 0,
      issues: ['Validation not yet implemented']
    };
  }
}

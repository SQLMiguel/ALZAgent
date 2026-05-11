export interface ADR {
  id: string;
  content: string;
}

export class ADRGenerator {
  async generateFromRequirements(_requirements: any): Promise<ADR[]> {
    return [];
  }
}

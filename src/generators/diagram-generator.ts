export interface Diagram {
  name: string;
  title: string;
  mermaidCode: string;
}

export class DiagramGenerator {
  async generate(_requirements: any): Promise<Diagram[]> {
    return [];
  }
}

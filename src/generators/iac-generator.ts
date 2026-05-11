export interface IaCTemplate {
  filename: string;
  content: string;
}

export class IaCGenerator {
  async generate(_requirements: any, _format: string): Promise<IaCTemplate[]> {
    return [];
  }
}

import { DocumentationGenerator } from './documentation-generator';

describe('DocumentationGenerator', () => {
  it('exposes the four operational doc specs', () => {
    const specs = DocumentationGenerator.specs();
    expect(specs).toHaveLength(4);
    const paths = specs.map((s) => s.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'docs/operations/landing-zone-overview.md',
        'docs/operations/runbook-deployment.md',
        'docs/operations/runbook-incident-response.md',
        'docs/operations/glossary.md',
      ])
    );
    for (const s of specs) {
      expect(s.label.length).toBeGreaterThan(0);
    }
  });
});

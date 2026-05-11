/**
 * Unit tests for the BM25-based RAG engine.
 */
import { RAGEngine } from './rag-engine';

describe('RAGEngine', () => {
  it('returns empty array when index is empty', async () => {
    const rag = new RAGEngine(); // no extensionUri => no shipped docs
    const hits = await rag.retrieve('landing zone hub spoke');
    expect(hits).toEqual([]);
  });

  it('reports stats after a no-source build', async () => {
    const rag = new RAGEngine();
    await rag.retrieve('anything'); // triggers buildIndex
    const stats = rag.getStats();
    expect(stats.indexed).toBe(true);
    expect(stats.chunks).toBe(0);
    expect(stats.sources).toBe(0);
  });

  it('formatContext returns empty string for no chunks', () => {
    expect(RAGEngine.formatContext([])).toBe('');
  });

  it('formatContext renders chunks with citation indices', () => {
    const out = RAGEngine.formatContext([
      { source: '/x/foo.md', heading: 'Hub', text: 'Hub-spoke topology details.', score: 1.2 },
      { source: '/x/bar.md', heading: 'Policy', text: 'Azure Policy guidance.', score: 0.9 },
    ]);
    expect(out).toContain('[1] Hub (foo.md)');
    expect(out).toContain('[2] Policy (bar.md)');
    expect(out).toContain('Hub-spoke topology details.');
  });
});

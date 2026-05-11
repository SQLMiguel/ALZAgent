/**
 * RAG (Retrieval-Augmented Generation) engine.
 *
 * Indexes local knowledge sources (extension-shipped docs and prompts, plus
 * any *.md files in the user's workspace) and retrieves the most relevant
 * chunks for a query using BM25. Zero external dependencies, no API keys,
 * no embeddings - keyword retrieval is sufficient for grounding the agent
 * in ALZ documentation and project-specific notes.
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface RetrievedChunk {
  source: string;
  heading: string;
  text: string;
  score: number;
}

interface IndexedChunk {
  source: string;
  heading: string;
  text: string;
  /** Token frequencies in this chunk (lowercased, stop-words removed). */
  termFreqs: Map<string, number>;
  length: number;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'should', 'could', 'may', 'might', 'must', 'shall', 'can',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'this',
  'that', 'these', 'those', 'it', 'its', 'if', 'then', 'else', 'so', 'than',
  'such', 'no', 'not', 'only', 'own', 'same', 'too', 'very',
]);

const MIN_CHUNK_LEN = 80;
const MAX_CHUNK_LEN = 1500;

export class RAGEngine {
  private chunks: IndexedChunk[] = [];
  /** doc-frequency: token -> number of chunks containing it. */
  private docFreq = new Map<string, number>();
  private avgChunkLen = 0;
  private indexed = false;
  private indexing?: Promise<void>;

  constructor(private extensionUri?: vscode.Uri) {}

  /** Build the index lazily on first call. Concurrent calls share the promise. */
  private async ensureIndexed(): Promise<void> {
    if (this.indexed) {
      return;
    }
    if (!this.indexing) {
      this.indexing = this.buildIndex();
    }
    await this.indexing;
  }

  private async buildIndex(): Promise<void> {
    const sources: Array<{ source: string; content: string }> = [];

    if (this.extensionUri) {
      const extRoot = this.extensionUri.fsPath;
      for (const sub of ['docs', 'prompts']) {
        await this.collectMarkdown(path.join(extRoot, sub), sources);
      }
    }

    try {
      const wsFiles = await vscode.workspace.findFiles(
        '**/*.md',
        '{**/node_modules/**,**/dist/**,**/out/**,**/.git/**}',
        200
      );
      for (const uri of wsFiles) {
        try {
          const content = await fs.readFile(uri.fsPath, 'utf8');
          sources.push({ source: uri.fsPath, content });
        } catch {
          // skip unreadable
        }
      }
    } catch {
      // findFiles may not be available in tests
    }

    for (const { source, content } of sources) {
      for (const chunk of this.chunkMarkdown(source, content)) {
        this.chunks.push(chunk);
      }
    }

    for (const chunk of this.chunks) {
      for (const term of chunk.termFreqs.keys()) {
        this.docFreq.set(term, (this.docFreq.get(term) ?? 0) + 1);
      }
    }
    this.avgChunkLen =
      this.chunks.length === 0
        ? 0
        : this.chunks.reduce((s, c) => s + c.length, 0) / this.chunks.length;

    this.indexed = true;
  }

  private async collectMarkdown(
    dir: string,
    out: Array<{ source: string; content: string }>
  ): Promise<void> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.collectMarkdown(full, out);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        try {
          const content = await fs.readFile(full, 'utf8');
          out.push({ source: full, content });
        } catch {
          // skip
        }
      }
    }
  }

  /**
   * Split markdown into heading-scoped chunks. Long sections are further
   * split on paragraph boundaries to stay under MAX_CHUNK_LEN.
   */
  private chunkMarkdown(source: string, content: string): IndexedChunk[] {
    const lines = content.split(/\r?\n/);
    const sections: Array<{ heading: string; body: string[] }> = [
      { heading: path.basename(source), body: [] },
    ];
    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
      if (headingMatch) {
        sections.push({ heading: headingMatch[2], body: [] });
      } else {
        sections[sections.length - 1].body.push(line);
      }
    }

    const out: IndexedChunk[] = [];
    for (const section of sections) {
      const text = section.body.join('\n').trim();
      if (text.length < MIN_CHUNK_LEN) {
        continue;
      }
      const pieces: string[] = [];
      if (text.length <= MAX_CHUNK_LEN) {
        pieces.push(text);
      } else {
        let buf = '';
        for (const para of text.split(/\n\s*\n/)) {
          if (buf.length + para.length + 2 > MAX_CHUNK_LEN && buf.length > 0) {
            pieces.push(buf.trim());
            buf = '';
          }
          buf += (buf ? '\n\n' : '') + para;
        }
        if (buf.trim().length > 0) {
          pieces.push(buf.trim());
        }
      }
      for (const piece of pieces) {
        const terms = tokenize(piece + ' ' + section.heading);
        if (terms.length === 0) {
          continue;
        }
        const tf = new Map<string, number>();
        for (const t of terms) {
          tf.set(t, (tf.get(t) ?? 0) + 1);
        }
        out.push({
          source,
          heading: section.heading,
          text: piece,
          termFreqs: tf,
          length: terms.length,
        });
      }
    }
    return out;
  }

  /**
   * Retrieve the top-K most relevant chunks for a query using BM25.
   */
  async retrieve(query: string, _session?: unknown, topK = 4): Promise<RetrievedChunk[]> {
    await this.ensureIndexed();
    if (this.chunks.length === 0) {
      return [];
    }
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) {
      return [];
    }

    const k1 = 1.5;
    const b = 0.75;
    const N = this.chunks.length;

    const scored: RetrievedChunk[] = this.chunks.map((chunk) => {
      let score = 0;
      for (const term of queryTerms) {
        const tf = chunk.termFreqs.get(term);
        if (!tf) {
          continue;
        }
        const df = this.docFreq.get(term) ?? 1;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const norm = (tf * (k1 + 1)) /
          (tf + k1 * (1 - b + b * (chunk.length / (this.avgChunkLen || 1))));
        score += idf * norm;
      }
      return {
        source: chunk.source,
        heading: chunk.heading,
        text: chunk.text,
        score,
      };
    });

    return scored
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /** Format retrieved chunks as a context block for prepending to a prompt. */
  static formatContext(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) {
      return '';
    }
    const blocks = chunks.map((c, i) => {
      const rel = path.basename(c.source);
      return `### [${i + 1}] ${c.heading} (${rel})\n${c.text}`;
    });
    return (
      '# Retrieved knowledge (use to ground your answer; cite by [n] when relevant):\n\n' +
      blocks.join('\n\n---\n\n') +
      '\n\n# End retrieved knowledge\n'
    );
  }

  /** Stats for diagnostics. */
  getStats(): { chunks: number; sources: number; indexed: boolean } {
    const sources = new Set(this.chunks.map((c) => c.source));
    return { chunks: this.chunks.length, sources: sources.size, indexed: this.indexed };
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[^a-z0-9_\-]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && t.length < 40 && !STOP_WORDS.has(t));
}

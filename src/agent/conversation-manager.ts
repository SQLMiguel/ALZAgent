/**
 * Conversation Manager
 * Persists and loads agent session state across conversations
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface Session {
  sessionId: string;
  createdAt: string;
  lastUpdated: string;
  currentPhase: string | null;
  phaseHistory: Array<{ phase: string; timestamp: string }>;
  requirements: any;
  design: any;
  adrs: any[];
  validation: any;
  iac: any;
  documentation: any;
  selfReview: any;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
}

export class ConversationManager {
  private sessionPath: string;

  constructor(private context: vscode.ExtensionContext) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }
    
    // Store session in .vscode directory (gitignored)
    const vscodePath = path.join(workspaceFolder.uri.fsPath, '.vscode');
    if (!fs.existsSync(vscodePath)) {
      fs.mkdirSync(vscodePath, { recursive: true });
    }
    
    this.sessionPath = path.join(vscodePath, 'alz-agent-session.json');
  }

  /**
   * Load existing session or create new one
   */
  async loadSession(sessionId: string): Promise<Session> {
    if (fs.existsSync(this.sessionPath)) {
      const content = fs.readFileSync(this.sessionPath, 'utf-8');
      const session = JSON.parse(content) as Session;
      
      // Update last accessed
      session.lastUpdated = new Date().toISOString();
      return session;
    }
    
    // Create new session
    return this.createNewSession(sessionId);
  }

  /**
   * Save session state to disk
   */
  async saveSession(session: Session): Promise<void> {
    session.lastUpdated = new Date().toISOString();
    const content = JSON.stringify(session, null, 2);
    fs.writeFileSync(this.sessionPath, content, 'utf-8');
  }

  /**
   * Append message to conversation history
   */
  appendMessage(session: Session, role: 'user' | 'assistant', content: string): void {
    session.conversationHistory = session.conversationHistory || [];
    session.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get recent conversation context (last N messages)
   */
  getRecentContext(session: Session, messageCount: number = 10): Array<any> {
    const history = session.conversationHistory || [];
    return history.slice(-messageCount);
  }

  /**
   * Clear session and start fresh
   */
  async clearSession(): Promise<void> {
    if (fs.existsSync(this.sessionPath)) {
      fs.unlinkSync(this.sessionPath);
    }
  }

  /**
   * Create new session
   */
  private createNewSession(sessionId: string): Session {
    return {
      sessionId,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      currentPhase: null,
      phaseHistory: [],
      requirements: {},
      design: {},
      adrs: [],
      validation: {},
      iac: {},
      documentation: {},
      selfReview: {},
      conversationHistory: []
    };
  }

  /**
   * Export session as JSON for debugging
   */
  async exportSession(session: Session, filePath: string): Promise<void> {
    const content = JSON.stringify(session, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Get session statistics
   */
  getSessionStats(session: Session): {
    messageCount: number;
    phasesCompleted: number;
    duration: number;
    artifactCounts: { adrs: number; iac: number; diagrams: number };
  } {
    const createdTime = new Date(session.createdAt).getTime();
    const now = Date.now();
    const duration = Math.floor((now - createdTime) / 1000); // seconds
    
    return {
      messageCount: session.conversationHistory?.length || 0,
      phasesCompleted: session.phaseHistory?.length || 0,
      duration,
      artifactCounts: {
        adrs: session.adrs?.length || 0,
        iac: session.iac?.templates?.length || 0,
        diagrams: session.documentation?.diagrams?.length || 0
      }
    };
  }
}

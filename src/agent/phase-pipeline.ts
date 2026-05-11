/**
 * Phase Pipeline State Machine
 * Manages transitions between ALZ Agent phases with gate validation
 */

export enum Phase {
  DISCOVERY = 'Discovery',
  DESIGN = 'Design',
  ADR = 'ADR',
  VALIDATION = 'Validation',
  IAC = 'IaC',
  DOCUMENTATION = 'Documentation',
  SELF_REVIEW = 'Self-Review'
}

export interface PhaseGate {
  phase: Phase;
  required: string[];  // Required artifacts to pass gate
  validation: (session: any) => Promise<boolean>;
}

export class PhasePipeline {
  private gates: Map<Phase, PhaseGate>;

  constructor() {
    this.gates = new Map([
      [Phase.DISCOVERY, {
        phase: Phase.DISCOVERY,
        required: ['requirements.subscriptionCount', 'requirements.networkingTopology'],
        validation: async (session) => this.validateDiscoveryGate(session)
      }],
      [Phase.DESIGN, {
        phase: Phase.DESIGN,
        required: ['design.managementGroups', 'design.networkArchitecture'],
        validation: async (session) => this.validateDesignGate(session)
      }],
      [Phase.ADR, {
        phase: Phase.ADR,
        required: ['adrs[0].title', 'adrs[0].decision'],
        validation: async (session) => this.validateADRGate(session)
      }],
      [Phase.VALIDATION, {
        phase: Phase.VALIDATION,
        required: ['validation.designReview', 'validation.securityCheck'],
        validation: async (session) => this.validateValidationGate(session)
      }],
      [Phase.IAC, {
        phase: Phase.IAC,
        required: ['iac.mainTemplate', 'iac.parametersFile'],
        validation: async (session) => this.validateIaCGate(session)
      }],
      [Phase.DOCUMENTATION, {
        phase: Phase.DOCUMENTATION,
        required: ['documentation.runbook', 'documentation.diagrams'],
        validation: async (session) => this.validateDocumentationGate(session)
      }],
      [Phase.SELF_REVIEW, {
        phase: Phase.SELF_REVIEW,
        required: ['selfReview.completenessCheck', 'selfReview.qualityScore'],
        validation: async (session) => this.validateSelfReviewGate(session)
      }]
    ]);
  }

  /**
   * Transition to new phase if gate passes
   */
  async transitionTo(targetPhase: Phase, session: any): Promise<boolean> {
    const currentPhase = session.currentPhase || null;
    
    // If moving forward, validate current phase gate first
    if (currentPhase) {
      const gate = this.gates.get(currentPhase);
      if (gate) {
        const passed = await gate.validation(session);
        if (!passed) {
          console.warn(`[Phase Pipeline] Gate validation failed for ${currentPhase}`);
          return false;
        }
      }
    }
    
    // Transition to target phase
    session.currentPhase = targetPhase;
    session.phaseHistory = session.phaseHistory || [];
    session.phaseHistory.push({
      phase: targetPhase,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[Phase Pipeline] Transitioned to ${targetPhase}`);
    return true;
  }

  /**
   * Get current phase
   */
  getCurrentPhase(session: any): Phase | null {
    return session.currentPhase || null;
  }

  /**
   * Check if all phases completed
   */
  isComplete(session: any): boolean {
    const completedPhases = session.phaseHistory?.map((h: any) => h.phase) || [];
    return Object.values(Phase).every(phase => completedPhases.includes(phase));
  }

  // Gate Validation Methods

  private async validateDiscoveryGate(session: any): Promise<boolean> {
    const reqs = session.requirements || {};
    return !!(
      reqs.subscriptionCount &&
      reqs.networkingTopology &&
      reqs.regions &&
      reqs.hybridConnectivity
    );
  }

  private async validateDesignGate(session: any): Promise<boolean> {
    const design = session.design || {};
    return !!(
      design.managementGroups &&
      design.networkArchitecture &&
      design.identityStrategy
    );
  }

  private async validateADRGate(session: any): Promise<boolean> {
    const adrs = session.adrs || [];
    // Require at least 1 ADR
    return adrs.length > 0 && adrs.every((adr: any) => 
      adr.title && adr.decision && adr.context && adr.alternatives
    );
  }

  private async validateValidationGate(session: any): Promise<boolean> {
    const validation = session.validation || {};
    return !!(
      validation.designReview &&
      validation.securityCheck &&
      validation.conformanceScore >= 95
    );
  }

  private async validateIaCGate(session: any): Promise<boolean> {
    const iac = session.iac || {};
    return !!(
      iac.mainTemplate &&
      iac.parametersFile &&
      iac.syntaxValid &&
      iac.securityScore >= 90
    );
  }

  private async validateDocumentationGate(session: any): Promise<boolean> {
    const docs = session.documentation || {};
    return !!(
      docs.runbook &&
      docs.diagrams &&
      docs.glossary
    );
  }

  private async validateSelfReviewGate(session: any): Promise<boolean> {
    const review = session.selfReview || {};
    return !!(
      review.completenessCheck &&
      review.qualityScore >= 90 &&
      review.responseTime <= 5
    );
  }
}

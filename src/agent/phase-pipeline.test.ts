import { PhasePipeline, Phase } from './phase-pipeline';

describe('PhasePipeline', () => {
  let pipeline: PhasePipeline;

  beforeEach(() => {
    pipeline = new PhasePipeline();
  });

  it('should transition to Discovery phase from initial state', async () => {
    const session: any = { currentPhase: null };
    const result = await pipeline.transitionTo(Phase.DISCOVERY, session);

    expect(result).toBe(true);
    expect(session.currentPhase).toBe(Phase.DISCOVERY);
    expect(session.phaseHistory).toHaveLength(1);
  });

  it('should block transition when current phase gate fails', async () => {
    const session: any = {
      currentPhase: Phase.DISCOVERY,
      requirements: {} // missing required fields
    };

    const result = await pipeline.transitionTo(Phase.DESIGN, session);
    expect(result).toBe(false);
  });

  it('should allow transition when current phase gate passes', async () => {
    const session: any = {
      currentPhase: Phase.DISCOVERY,
      requirements: {
        subscriptionCount: 50,
        networkingTopology: 'Virtual WAN',
        regions: ['East US'],
        hybridConnectivity: 'ExpressRoute'
      }
    };

    const result = await pipeline.transitionTo(Phase.DESIGN, session);
    expect(result).toBe(true);
    expect(session.currentPhase).toBe(Phase.DESIGN);
  });

  it('should report incomplete when phases missing', () => {
    const session: any = { phaseHistory: [{ phase: Phase.DISCOVERY }] };
    expect(pipeline.isComplete(session)).toBe(false);
  });

  it('should report complete when all phases recorded', () => {
    const session: any = {
      phaseHistory: Object.values(Phase).map((p) => ({ phase: p }))
    };
    expect(pipeline.isComplete(session)).toBe(true);
  });
});

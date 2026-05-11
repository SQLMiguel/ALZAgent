/**
 * Smoke tests for ExtensionIntegrations - these run against the Jest mock
 * of the vscode module so we only assert the safe-fallback paths.
 */
import { ExtensionIntegrations, EXTENSION_IDS } from './extension-integrations';

describe('ExtensionIntegrations', () => {
  it('reports all five Tier 1 extensions in getStatus()', () => {
    const status = ExtensionIntegrations.getStatus();
    const ids = status.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        EXTENSION_IDS.copilotChat,
        EXTENSION_IDS.bicep,
        EXTENSION_IDS.azureMcp,
        EXTENSION_IDS.azureResources,
        EXTENSION_IDS.azureCli,
      ])
    );
    // The vscode mock has no extensions registered, so all should be uninstalled.
    for (const s of status) {
      expect(s.installed).toBe(false);
      expect(s.active).toBe(false);
    }
  });

  it('hasBicepExtension returns false in the mock environment', () => {
    expect(ExtensionIntegrations.hasBicepExtension()).toBe(false);
  });

  it('showBicepVisualizer returns false when extension is absent', async () => {
    const result = await ExtensionIntegrations.showBicepVisualizer('/tmp/x.bicep');
    expect(result).toBe(false);
  });
});

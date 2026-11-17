import { describe, expect, it } from 'vitest';
import { FeatureFlag, experimentalFeatureFlags, featureFlagConfig } from './FeatureFlag';

describe('experimentalFeatureFlags', () => {
  it('contains the flags that are configured as experimental', () => {
    const configuredAsExperimental = Object.values(FeatureFlag).filter(
      (flag) => featureFlagConfig[flag].experimental,
    );
    expect(experimentalFeatureFlags).toEqual(configuredAsExperimental);
  });

  it('does not contain flags that are only for developers', () => {
    expect(experimentalFeatureFlags).not.toContain(FeatureFlag.ShouldOverrideAppLibCheck);
  });
});

import { describe, expect, it } from 'vitest';
import type { AppVersion } from 'app-shared/types/AppVersion';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { isAppBuilderSupported } from './appBuilderAvailability';

const v9: AppVersion = { backendVersion: '9.0.0', frontendVersion: '9.1.0' };
const metadataCreatedAt = (created?: string): ApplicationMetadata => ({
  id: 'org/app',
  org: 'org',
  created,
});
const createdTomorrow = metadataCreatedAt('2026-11-23T08:00:00Z');

describe('isAppBuilderSupported', () => {
  it('supports a v9 app created after 22 November 2026', () => {
    expect(isAppBuilderSupported(v9, createdTomorrow)).toBe(true);
  });

  it('supports an app created just after midnight in Norway', () => {
    expect(isAppBuilderSupported(v9, metadataCreatedAt('2026-11-22T23:00:00Z'))).toBe(true);
  });

  it('does not support an app created on 22 November 2026 or before', () => {
    expect(isAppBuilderSupported(v9, metadataCreatedAt('2026-11-22T22:59:59Z'))).toBe(false);
    expect(isAppBuilderSupported(v9, metadataCreatedAt('2025-01-01T00:00:00Z'))).toBe(false);
  });

  it('does not support an app without a valid created date', () => {
    expect(isAppBuilderSupported(v9, metadataCreatedAt(undefined))).toBe(false);
    expect(isAppBuilderSupported(v9, metadataCreatedAt('not a date'))).toBe(false);
    expect(isAppBuilderSupported(v9, undefined)).toBe(false);
  });

  it('does not support an app below v9 on the backend or the frontend', () => {
    expect(
      isAppBuilderSupported({ backendVersion: '8.5.0', frontendVersion: '9.0.0' }, createdTomorrow),
    ).toBe(false);
    expect(
      isAppBuilderSupported(
        { backendVersion: '9.0.0', frontendVersion: '4.20.0' },
        createdTomorrow,
      ),
    ).toBe(false);
    expect(isAppBuilderSupported(undefined, createdTomorrow)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import type { EnvironmentEntry } from '../../EnvironmentConfig';
import type { RequiredEFormidlingEntries } from './eFormidlingCoverage';
import { getEFormidlingCoverageGaps, getUniversalCoverageGap } from './eFormidlingCoverage';

describe('getEFormidlingCoverageGaps', () => {
  it('reports all environments when configuration is missing', () => {
    expect(getEFormidlingCoverageGaps(createEntries())).toEqual([
      { environment: 'development', missingProperties: allProperties },
      { environment: 'staging', missingProperties: allProperties },
      { environment: 'production', missingProperties: allProperties },
    ]);
  });

  it('reports no gaps when default values cover all environments', () => {
    expect(
      getEFormidlingCoverageGaps(
        createEntries({
          process: [{ value: 'a-process' }],
          standard: [{ value: 'a-standard' }],
          type: [{ value: 'a-type' }],
          typeVersion: [{ value: '2.0' }],
          securityLevel: [{ value: '3' }],
        }),
      ),
    ).toEqual([]);
  });

  it('reports environments without an override or default value', () => {
    expect(
      getEFormidlingCoverageGaps(
        createEntries({
          process: [{ env: 'tt02', value: 'a-process' }],
          standard: [{ value: 'a-standard' }],
          type: [{ value: 'a-type' }],
          typeVersion: [{ value: '2.0' }],
          securityLevel: [{ value: '3' }],
        }),
      ),
    ).toEqual([
      { environment: 'development', missingProperties: ['process'] },
      { environment: 'production', missingProperties: ['process'] },
    ]);
  });

  it('treats blank values as missing', () => {
    const gaps = getEFormidlingCoverageGaps(
      createEntries({
        process: [{ value: '   ' }],
        standard: [{ value: 'a-standard' }],
        type: [{ value: 'a-type' }],
        typeVersion: [{ value: '2.0' }],
        securityLevel: [{ value: '3' }],
      }),
    );

    expect(gaps).toHaveLength(3);
    expect(gaps[0].missingProperties).toEqual(['process']);
  });

  it('reports a security level that is not a whole number', () => {
    const gaps = getEFormidlingCoverageGaps(
      createEntries({
        process: [{ value: 'a-process' }],
        standard: [{ value: 'a-standard' }],
        type: [{ value: 'a-type' }],
        typeVersion: [{ value: '2.0' }],
        securityLevel: [{ value: '3.5' }],
      }),
    );

    expect(gaps).toHaveLength(3);
    expect(gaps[0].missingProperties).toEqual(['securityLevel']);
  });

  it('uses the last entry for duplicate environments', () => {
    expect(
      getEFormidlingCoverageGaps(
        createEntries({
          process: [
            { env: 'tt02', value: 'a-process' },
            { env: 'at22', value: '' },
          ],
          standard: [{ value: 'a-standard' }],
          type: [{ value: 'a-type' }],
          typeVersion: [{ value: '2.0' }],
          securityLevel: [{ value: '3' }],
        }),
      ).map(({ environment }) => environment),
    ).toEqual(['development', 'staging', 'production']);
  });
});

describe('getUniversalCoverageGap', () => {
  it('returns shared missing fields when all environments have the same gaps', () => {
    expect(getUniversalCoverageGap(getEFormidlingCoverageGaps(createEntries()))).toEqual(
      allProperties,
    );
  });

  it('returns undefined when environments have different gaps', () => {
    const gaps = getEFormidlingCoverageGaps(
      createEntries({ process: [{ env: 'tt02', value: 'a-process' }] }),
    );

    expect(getUniversalCoverageGap(gaps)).toBeUndefined();
  });

  it('returns undefined when one environment has no gaps', () => {
    expect(
      getUniversalCoverageGap([
        { environment: 'development', missingProperties: ['process'] },
        { environment: 'staging', missingProperties: ['process'] },
      ]),
    ).toBeUndefined();
  });
});

const allProperties = ['process', 'standard', 'type', 'typeVersion', 'securityLevel'];

const createEntries = (
  entries: Partial<RequiredEFormidlingEntries> = {},
): RequiredEFormidlingEntries => {
  const noEntries: EnvironmentEntry<string>[] = [];
  return {
    process: noEntries,
    standard: noEntries,
    type: noEntries,
    typeVersion: noEntries,
    securityLevel: noEntries,
    ...entries,
  };
};

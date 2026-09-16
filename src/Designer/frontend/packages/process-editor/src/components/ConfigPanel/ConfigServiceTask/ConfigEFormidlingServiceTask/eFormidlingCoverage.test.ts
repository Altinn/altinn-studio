import type { EnvironmentEntry } from '../../EnvironmentConfig';
import type { RequiredEFormidlingEntries } from './eFormidlingCoverage';
import { getEFormidlingCoverageGaps, getUniversalCoverageGap } from './eFormidlingCoverage';

describe('getEFormidlingCoverageGaps', () => {
  it('reports every environment when nothing is configured at all', () => {
    expect(getEFormidlingCoverageGaps(createEntries())).toEqual([
      { environment: 'development', missingProperties: allProperties },
      { environment: 'staging', missingProperties: allProperties },
      { environment: 'production', missingProperties: allProperties },
    ]);
  });

  it('reports nothing when an environment-independent value covers every environment', () => {
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

  // The runtime looks up the value for the environment it runs in and falls back to the entry
  // without an `env`, so an override only answers for its own environment.
  it('reports the environments an override does not reach', () => {
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

  it('reports a blank value as no value, the way the runtime does', () => {
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

  // `GetRequiredIntConfig` fails the startup on a value it cannot parse just as it does on a
  // missing one, so a security level that is not a whole number is the same gap.
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

  // The runtime resolves `tt02` and `at22` to the same environment and reads the last of them, so
  // the panel has to answer for that environment with the same entry.
  it('follows the runtime when two entries resolve to the same environment', () => {
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
  it('answers the shared fields when every environment is short of the same ones', () => {
    expect(getUniversalCoverageGap(getEFormidlingCoverageGaps(createEntries()))).toEqual(
      allProperties,
    );
  });

  it('answers undefined when the environments are short of different fields', () => {
    const gaps = getEFormidlingCoverageGaps(
      createEntries({ process: [{ env: 'tt02', value: 'a-process' }] }),
    );

    expect(getUniversalCoverageGap(gaps)).toBeUndefined();
  });

  it('answers undefined when one environment is fully configured', () => {
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

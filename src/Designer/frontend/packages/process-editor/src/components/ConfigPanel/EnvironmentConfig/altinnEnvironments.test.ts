import path from 'path';
import fs from 'fs';
import { environmentAliases, isGlobalEnv, normalizeAltinnEnvironment } from './altinnEnvironments';

describe('normalizeAltinnEnvironment', () => {
  // The table itself is the runtime's, and restating all of it here could not catch the one
  // failure that matters: drifting from the C# source. These are the shapes of alias it has -
  // the bucket's own name, a short form, and a deployment name that looks like neither.
  it.each([
    ['development', 'development'],
    ['prod', 'production'],
    ['tt02', 'staging'],
  ])('resolves %s to %s, matching the runtime alias table', (env, expected) => {
    expect(normalizeAltinnEnvironment(env)).toBe(expected);
  });

  it('matches case-insensitively, like the runtime does', () => {
    expect(normalizeAltinnEnvironment('TT02')).toBe('staging');
    expect(normalizeAltinnEnvironment('Production')).toBe('production');
  });

  it('returns undefined for an environment the runtime would resolve to Unknown', () => {
    expect(normalizeAltinnEnvironment('at21')).toBeUndefined();
    expect(normalizeAltinnEnvironment('')).toBeUndefined();
  });
});

describe('isGlobalEnv', () => {
  it.each([undefined, '', '  '])('treats %p as the environment-independent entry', (env) => {
    expect(isGlobalEnv(env)).toBe(true);
  });

  it('treats a named environment as scoped', () => {
    expect(isGlobalEnv('tt02')).toBe(false);
  });
});

describe('environmentAliases', () => {
  // The table belongs to the app runtime, and nothing stops it changing without Studio. Restating
  // it here would only restate the copy, so the test reads the C# and compares. Both files live in
  // this monorepo, and `AltinnEnvironments.cs` carries a comment pointing back here.
  it('holds the same aliases as the app runtime table it mirrors', () => {
    const runtimeAliases = parseRuntimeEnvironmentAliases(readRuntimeEnvironmentsSource());

    // Prove the parse understood the file before comparing: a C# file whose shape has changed
    // would otherwise yield nothing and turn this into a test that cannot fail.
    expect(Object.keys(runtimeAliases).sort()).toEqual(Object.keys(environmentAliases).sort());
    const emptyBuckets = Object.keys(runtimeAliases).filter(
      (environment) => runtimeAliases[environment].length === 0,
    );
    expect(emptyBuckets).toEqual([]);

    // Sorted, because alias order means nothing on either side: the runtime asks `Contains`, the
    // mirror asks `includes`, and the canonical name is the bucket key rather than the first alias.
    // Reordering the C# list is a no-op, and should not redden the frontend build.
    expect(withSortedAliases(runtimeAliases)).toEqual(withSortedAliases(environmentAliases));
  });
});

/** The app runtime's own copy, nine directories up at the root of this monorepo. */
const runtimeEnvironmentsPath = path.resolve(
  __dirname,
  '../../../../../../../../../src/App/backend/src/Altinn.App.Core/Constants/AltinnEnvironments.cs',
);

const readRuntimeEnvironmentsSource = (): string => {
  if (!fs.existsSync(runtimeEnvironmentsPath)) {
    throw new Error(
      `The app runtime environment table was not found at ${runtimeEnvironmentsPath}. It has been ` +
        'moved or renamed - point this test and the mirror in altinnEnvironments.ts at its new home.',
    );
  }
  return fs.readFileSync(runtimeEnvironmentsPath, 'utf-8');
};

/**
 * Reads the alias lists out of the runtime's `Map` initializer. An alias is either a string literal
 * or `Environments.<Name>.ToLower(...)`, which is the bucket's own name in lower case.
 */
const parseRuntimeEnvironmentAliases = (source: string): Record<string, string[]> => {
  const bucketPattern = /\[HostingEnvironment\.(\w+)\]\s*=\s*\[([^\]]*)\]/g;
  const aliasPattern = /"([^"]*)"|Environments\.(\w+)\s*\.\s*ToLower\s*\(/g;
  const aliasesByEnvironment: Record<string, string[]> = {};

  for (const [, environment, aliasSource] of source.matchAll(bucketPattern)) {
    aliasesByEnvironment[environment.toLowerCase()] = [...aliasSource.matchAll(aliasPattern)].map(
      ([, literal, environmentsMember]) => literal ?? environmentsMember.toLowerCase(),
    );
  }

  return aliasesByEnvironment;
};

const withSortedAliases = (
  aliasesByEnvironment: Readonly<Record<string, readonly string[]>>,
): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(aliasesByEnvironment).map(([environment, aliases]) => [
      environment,
      [...aliases].sort(),
    ]),
  );

import { isGlobalEnv, normalizeAltinnEnvironment } from './altinnEnvironments';

describe('normalizeAltinnEnvironment', () => {
  it.each([
    ['development', 'development'],
    ['prod', 'production'],
    ['tt02', 'staging'],
  ])('resolves %s to %s', (env, expected) => {
    expect(normalizeAltinnEnvironment(env)).toBe(expected);
  });

  it('matches case-insensitively, like the runtime does', () => {
    expect(normalizeAltinnEnvironment('TT02')).toBe('staging');
    expect(normalizeAltinnEnvironment('Production')).toBe('production');
  });

  it('returns undefined for an environment the runtime does not recognize', () => {
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

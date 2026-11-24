import { describe, expect, it } from 'vitest';
import { getSubmitters, submitterChoices, toPartyTypesAllowed } from './submitterUtils';

describe('submitters', () => {
  it.each(submitterChoices)('reads back %s', (submitters) => {
    expect(getSubmitters(toPartyTypesAllowed(submitters))).toBe(submitters);
  });

  it('reads no allowed party types as both, since the app then allows every type', () => {
    expect(getSubmitters(undefined)).toBe('both');
  });
});

import type { MaskinportenScope, MaskinportenScopes } from 'app-shared/types/MaskinportenScope';
import {
  defaultMaskinportenScopeNames,
  hasDefaultMaskinportenScopes,
  isDefaultMaskinportenScope,
} from './maskinportenScopes';

const readScope: MaskinportenScope = {
  scope: 'altinn:serviceowner/instances.read',
  description: 'Read instances',
};
const writeScope: MaskinportenScope = {
  scope: 'altinn:serviceowner/instances.write',
  description: 'Write instances',
};
const customScope: MaskinportenScope = {
  scope: 'custom:scope',
  description: 'Custom scope',
};

describe('maskinportenScopes', () => {
  it('identifies default Maskinporten scopes', () => {
    expect(defaultMaskinportenScopeNames).toEqual([readScope.scope, writeScope.scope]);
    expect(isDefaultMaskinportenScope(readScope.scope)).toBe(true);
    expect(isDefaultMaskinportenScope(writeScope.scope)).toBe(true);
    expect(isDefaultMaskinportenScope(customScope.scope)).toBe(false);
  });

  it('checks default scopes from a scope array', () => {
    expect(hasDefaultMaskinportenScopes([readScope, writeScope, customScope])).toBe(true);
    expect(hasDefaultMaskinportenScopes([readScope, customScope])).toBe(false);
  });

  it('checks default scopes from a scopes object', () => {
    const scopes: MaskinportenScopes = { scopes: [readScope, writeScope] };

    expect(hasDefaultMaskinportenScopes(scopes)).toBe(true);
  });

  it('returns false when scopes are missing', () => {
    expect(hasDefaultMaskinportenScopes(undefined)).toBe(false);
    expect(hasDefaultMaskinportenScopes({ scopes: [] })).toBe(false);
  });
});

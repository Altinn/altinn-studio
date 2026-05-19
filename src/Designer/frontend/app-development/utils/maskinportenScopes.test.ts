import type { MaskinportenScope, MaskinportenScopes } from 'app-shared/types/MaskinportenScope';
import {
  addDefaultMaskinportenScopes,
  defaultMaskinportenScopeNames,
  defaultMaskinportenScopes,
  hasDefaultMaskinportenScopes,
  isDefaultMaskinportenScope,
  shouldShowDefaultMaskinportenScopesOptIn,
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
    expect(defaultMaskinportenScopes).toEqual([readScope, writeScope]);
    expect(defaultMaskinportenScopeNames).toEqual([readScope.scope, writeScope.scope]);
    expect(isDefaultMaskinportenScope(readScope.scope)).toBe(true);
    expect(isDefaultMaskinportenScope(writeScope.scope)).toBe(true);
    expect(isDefaultMaskinportenScope(customScope.scope)).toBe(false);
  });

  it('adds missing default scopes to a scope array', () => {
    expect(addDefaultMaskinportenScopes([customScope])).toEqual([
      customScope,
      readScope,
      writeScope,
    ]);
  });

  it('keeps existing default scope data when adding missing default scopes', () => {
    const readScopeWithApiDescription: MaskinportenScope = {
      ...readScope,
      description: 'Description from API',
    };

    expect(addDefaultMaskinportenScopes([readScopeWithApiDescription, customScope])).toEqual([
      readScopeWithApiDescription,
      customScope,
      writeScope,
    ]);
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

  it('shows default scope opt-in only for v8.3 apps missing default scopes', () => {
    expect(shouldShowDefaultMaskinportenScopesOptIn('8.3.0', [customScope])).toBe(true);
    expect(shouldShowDefaultMaskinportenScopesOptIn('8.3.0', [readScope, writeScope])).toBe(false);
    expect(shouldShowDefaultMaskinportenScopesOptIn('8.2.9', [customScope])).toBe(false);
    expect(shouldShowDefaultMaskinportenScopesOptIn('9.0.0', [customScope])).toBe(false);
  });
});

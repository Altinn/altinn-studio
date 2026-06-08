import type { MaskinportenScope, MaskinportenScopes } from 'app-shared/types/MaskinportenScope';
import {
  addDefaultMaskinportenScopes,
  defaultMaskinportenScopeNames,
  defaultMaskinportenScopes,
  hasDefaultMaskinportenScopes,
  isDefaultMaskinportenScope,
  shouldShowDefaultMaskinportenScopesOptIn,
} from './maskinportenScopes';

const serviceOwnerScope: MaskinportenScope = {
  scope: 'altinn:serviceowner',
  description: 'Brukes til å indikere at klienten er et tjenesteeiersystem.',
};
const readScope: MaskinportenScope = {
  scope: 'altinn:serviceowner/instances.read',
  description: 'Klienter kan lese data knyttet til alle appene til tjenesteeieren.',
};
const writeScope: MaskinportenScope = {
  scope: 'altinn:serviceowner/instances.write',
  description: 'Klienter kan skrive data for alle deres apper.',
};
const customScope: MaskinportenScope = {
  scope: 'custom:scope',
  description: 'Custom scope',
};

describe('maskinportenScopes', () => {
  it('identifies default Maskinporten scopes', () => {
    expect(defaultMaskinportenScopes).toEqual([serviceOwnerScope, readScope, writeScope]);
    expect(defaultMaskinportenScopeNames).toEqual([
      serviceOwnerScope.scope,
      readScope.scope,
      writeScope.scope,
    ]);
    expect(isDefaultMaskinportenScope(serviceOwnerScope.scope)).toBe(true);
    expect(isDefaultMaskinportenScope(readScope.scope)).toBe(true);
    expect(isDefaultMaskinportenScope(writeScope.scope)).toBe(true);
    expect(isDefaultMaskinportenScope(customScope.scope)).toBe(false);
  });

  it('adds missing default scopes to a scope array', () => {
    expect(addDefaultMaskinportenScopes([customScope])).toEqual([
      customScope,
      serviceOwnerScope,
      readScope,
      writeScope,
    ]);
  });

  it('uses canonical default scope data when adding default scopes', () => {
    const readScopeWithApiDescription: MaskinportenScope = {
      ...readScope,
      description: 'Description from API',
    };

    expect(addDefaultMaskinportenScopes([readScopeWithApiDescription, customScope])).toEqual([
      readScope,
      customScope,
      serviceOwnerScope,
      writeScope,
    ]);
  });

  it('checks default scopes from a scope array', () => {
    expect(
      hasDefaultMaskinportenScopes([serviceOwnerScope, readScope, writeScope, customScope]),
    ).toBe(true);
    expect(hasDefaultMaskinportenScopes([serviceOwnerScope, readScope, customScope])).toBe(false);
  });

  it('checks default scopes from a scopes object', () => {
    const scopes: MaskinportenScopes = { scopes: [serviceOwnerScope, readScope, writeScope] };

    expect(hasDefaultMaskinportenScopes(scopes)).toBe(true);
  });

  it('returns false when scopes are missing', () => {
    expect(hasDefaultMaskinportenScopes(undefined)).toBe(false);
    expect(hasDefaultMaskinportenScopes({ scopes: [] })).toBe(false);
  });

  it('shows default scope opt-in only for v8.3 apps missing default scopes', () => {
    expect(shouldShowDefaultMaskinportenScopesOptIn('8.3.0', [customScope])).toBe(true);
    expect(
      shouldShowDefaultMaskinportenScopesOptIn('8.3.0', [serviceOwnerScope, readScope, writeScope]),
    ).toBe(false);
    expect(shouldShowDefaultMaskinportenScopesOptIn('8.2.9', [customScope])).toBe(false);
    expect(shouldShowDefaultMaskinportenScopesOptIn('9.0.0', [customScope])).toBe(false);
  });
});

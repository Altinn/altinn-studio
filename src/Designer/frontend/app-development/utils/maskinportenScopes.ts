import type { MaskinportenScope, MaskinportenScopes } from 'app-shared/types/MaskinportenScope';

export const defaultMaskinportenScopeNames = [
  'altinn:serviceowner/instances.read',
  'altinn:serviceowner/instances.write',
];

export const isDefaultMaskinportenScope = (scopeName: string): boolean =>
  defaultMaskinportenScopeNames.includes(scopeName);

export const hasDefaultMaskinportenScopes = (
  maskinportenScopes: MaskinportenScope[] | MaskinportenScopes | undefined,
): boolean => {
  const scopes = Array.isArray(maskinportenScopes)
    ? maskinportenScopes
    : (maskinportenScopes?.scopes ?? []);
  const scopeNames = new Set(scopes.map((scope) => scope.scope));
  return defaultMaskinportenScopeNames.every((scopeName) => scopeNames.has(scopeName));
};

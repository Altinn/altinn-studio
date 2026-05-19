import type { MaskinportenScope, MaskinportenScopes } from 'app-shared/types/MaskinportenScope';
import { isMaskinportenDefaultScopesOptInVersion } from './versionUtils';

export const defaultMaskinportenScopes: MaskinportenScope[] = [
  {
    scope: 'altinn:serviceowner/instances.read',
    description: 'Read instances',
  },
  {
    scope: 'altinn:serviceowner/instances.write',
    description: 'Write instances',
  },
];

export const defaultMaskinportenScopeNames = defaultMaskinportenScopes.map(({ scope }) => scope);

export const isDefaultMaskinportenScope = (scopeName: string): boolean =>
  defaultMaskinportenScopeNames.includes(scopeName);

export const addDefaultMaskinportenScopes = (
  maskinportenScopes: MaskinportenScope[],
): MaskinportenScope[] => {
  const scopeMap = new Map(
    maskinportenScopes.map((scope: MaskinportenScope) => [scope.scope, scope]),
  );
  defaultMaskinportenScopes.forEach((scope: MaskinportenScope) => {
    if (!scopeMap.has(scope.scope)) {
      scopeMap.set(scope.scope, scope);
    }
  });

  return Array.from(scopeMap.values());
};

export const hasDefaultMaskinportenScopes = (
  maskinportenScopes: MaskinportenScope[] | MaskinportenScopes | undefined,
): boolean => {
  const scopes = Array.isArray(maskinportenScopes)
    ? maskinportenScopes
    : (maskinportenScopes?.scopes ?? []);
  const scopeNames = new Set(scopes.map((scope) => scope.scope));
  return defaultMaskinportenScopeNames.every((scopeName) => scopeNames.has(scopeName));
};

export const shouldShowDefaultMaskinportenScopesOptIn = (
  appBackendVersion: string | undefined,
  selectedScopes: MaskinportenScope[] | MaskinportenScopes | undefined,
): boolean =>
  isMaskinportenDefaultScopesOptInVersion(appBackendVersion) &&
  !hasDefaultMaskinportenScopes(selectedScopes);

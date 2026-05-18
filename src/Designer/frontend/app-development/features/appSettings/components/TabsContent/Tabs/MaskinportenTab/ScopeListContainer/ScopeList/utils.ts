import type { MaskinportenScope } from 'app-shared/types/MaskinportenScope';

const mandatoryMaskinportenScopeNames: Set<string> = new Set([
  'altinn:serviceowner/instances.read',
  'altinn:serviceowner/instances.write',
]);

export function mapSelectedValuesToMaskinportenScopes(
  selectedValues: string[],
  allOptions: MaskinportenScope[],
): MaskinportenScope[] {
  return allOptions.filter((scope: MaskinportenScope) => selectedValues.includes(scope.scope));
}

export function mapMaskinPortenScopesToScopeList(
  maskinPortenScopes: MaskinportenScope[],
): string[] {
  return maskinPortenScopes.map((scope: MaskinportenScope) => scope.scope);
}

export function combineSelectedAndMaskinportenScopes(
  selectedScopes: MaskinportenScope[],
  maskinportenScopes: MaskinportenScope[],
): MaskinportenScope[] {
  return sortScopesForDisplay(mergeTwoScopeListsToOne(maskinportenScopes, selectedScopes));
}

export function sortScopesForDisplay(scopes: MaskinportenScope[]): MaskinportenScope[] {
  return [...scopes].sort((left: MaskinportenScope, right: MaskinportenScope) => {
    const leftIsServiceOwnerScope = isServiceOwnerScope(left.scope);
    const rightIsServiceOwnerScope = isServiceOwnerScope(right.scope);

    if (leftIsServiceOwnerScope !== rightIsServiceOwnerScope) {
      return leftIsServiceOwnerScope ? -1 : 1;
    }

    return left.scope.localeCompare(right.scope, undefined, { sensitivity: 'base' });
  });
}

export const isMandatoryMaskinportenScope = (scopeName: string): boolean =>
  mandatoryMaskinportenScopeNames.has(scopeName);

const isServiceOwnerScope = (scopeName: string): boolean =>
  scopeName.startsWith('altinn:serviceowner');

const mergeTwoScopeListsToOne = (
  maskinPortenScopes: MaskinportenScope[],
  selectedScopes: MaskinportenScope[],
): MaskinportenScope[] => {
  const scopeMap: Map<string, MaskinportenScope> = new Map();
  maskinPortenScopes.forEach((scope: MaskinportenScope) => scopeMap.set(scope.scope, scope));
  selectedScopes.forEach((scope: MaskinportenScope) => scopeMap.set(scope.scope, scope));
  return Array.from(scopeMap.values());
};

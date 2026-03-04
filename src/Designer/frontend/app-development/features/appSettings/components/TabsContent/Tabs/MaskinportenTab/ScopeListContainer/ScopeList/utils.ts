import type { MaskinportenScope } from 'app-shared/types/MaskinportenScope';

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
  const combinedScopesList: MaskinportenScope[] = mergeTwoScopeListsToOne(
    maskinportenScopes,
    selectedScopes,
  );

  const selectedScopeNames = new Set<string>(
    selectedScopes.map((scope: MaskinportenScope) => scope.scope),
  );

  return combinedScopesList.sort((left: MaskinportenScope, right: MaskinportenScope) => {
    const leftIsSelected = selectedScopeNames.has(left.scope);
    const rightIsSelected = selectedScopeNames.has(right.scope);

    if (leftIsSelected !== rightIsSelected) {
      return leftIsSelected ? -1 : 1;
    }

    return left.scope.localeCompare(right.scope, undefined, { sensitivity: 'base' });
  });
}

const mergeTwoScopeListsToOne = (
  maskinPortenScopes: MaskinportenScope[],
  selectedScopes: MaskinportenScope[],
): MaskinportenScope[] => {
  const scopeMap: Map<string, MaskinportenScope> = new Map();
  maskinPortenScopes.forEach((scope: MaskinportenScope) => scopeMap.set(scope.scope, scope));
  selectedScopes.forEach((scope: MaskinportenScope) => scopeMap.set(scope.scope, scope));
  return Array.from(scopeMap.values());
};

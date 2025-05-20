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

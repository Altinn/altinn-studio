import { type StudioCheckboxTableRowElement } from '@studio/components';
import { type MaskinportenScope } from 'app-shared/types/MaskinportenScope';

export const mapScopesToRowElements = (
  scopes: MaskinportenScope[],
  selectedScopes: MaskinportenScope[],
): StudioCheckboxTableRowElement[] => {
  return scopes.map((scope) => ({
    label: scope.scope,
    value: scope.scope,
    description: scope.description,
    checked: selectedScopes.some((selected) => selected.scope === scope.scope),
  }));
};

export const mapRowElementsToSelectedScopes = (
  rowElements: StudioCheckboxTableRowElement[],
): MaskinportenScope[] => {
  const listOfOnlyCheckedRows: StudioCheckboxTableRowElement[] = filterOutCheckedRows(rowElements);
  const mappedScopes: MaskinportenScope[] = mapRowElementsToScopes(listOfOnlyCheckedRows);
  return mappedScopes;
};

export const filterOutCheckedRows = (
  rowElements: StudioCheckboxTableRowElement[],
): StudioCheckboxTableRowElement[] => {
  return rowElements.filter((rowElement: StudioCheckboxTableRowElement) => rowElement.checked);
};

export const mapRowElementsToScopes = (
  rowElements: StudioCheckboxTableRowElement[],
): MaskinportenScope[] => {
  return rowElements.map((rowElement: StudioCheckboxTableRowElement) => ({
    scope: rowElement.value,
    description: rowElement.description || '',
  }));
};

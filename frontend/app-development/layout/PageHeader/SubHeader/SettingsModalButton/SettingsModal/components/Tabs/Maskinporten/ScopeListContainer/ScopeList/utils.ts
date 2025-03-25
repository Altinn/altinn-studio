import { type StudioCheckboxTableRowElement } from '@studio/components-legacy';
import { type MaskinportenScope } from 'app-shared/types/MaskinportenScope';

export const mapScopesToRowElements = (
  maskinportenScopes: MaskinportenScope[],
  selectedScopes: MaskinportenScope[],
): StudioCheckboxTableRowElement[] => {
  const combinedScopesList: MaskinportenScope[] = mergeTwoScopeListsToOne(
    maskinportenScopes,
    selectedScopes,
  );

  return combinedScopesList.map((scope: MaskinportenScope) => ({
    label: scope.scope,
    value: scope.scope,
    description: scope.description,
    checked: isScopeSelected(scope, selectedScopes),
    disabled: !isScopeAvailable(scope, maskinportenScopes),
  }));
};

const mergeTwoScopeListsToOne = (
  maskinPortenScopes: MaskinportenScope[],
  selectedScopes: MaskinportenScope[],
): MaskinportenScope[] => {
  const scopeMap: Map<string, MaskinportenScope> = new Map();
  maskinPortenScopes.forEach((scope: MaskinportenScope) => scopeMap.set(scope.scope, scope));
  selectedScopes.forEach((scope: MaskinportenScope) => scopeMap.set(scope.scope, scope));
  return Array.from(scopeMap.values());
};

const isScopeSelected = (
  scope: MaskinportenScope,
  selectedScopes: MaskinportenScope[],
): boolean => {
  return selectedScopes.some((selected: MaskinportenScope) => selected.scope === scope.scope);
};

const isScopeAvailable = (
  scope: MaskinportenScope,
  maskinPortenScopes: MaskinportenScope[],
): boolean => {
  return maskinPortenScopes.some((available: MaskinportenScope) => available.scope === scope.scope);
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

export const updateRowElementsCheckedState = (
  rowElements: StudioCheckboxTableRowElement[],
  areAllChecked: boolean,
): StudioCheckboxTableRowElement[] => {
  return rowElements.map((element: StudioCheckboxTableRowElement) =>
    element.disabled
      ? element
      : {
          ...element,
          checked: !areAllChecked,
        },
  );
};

export const toggleRowElementCheckedState = (
  rowElements: StudioCheckboxTableRowElement[],
  selectedScope: string,
): StudioCheckboxTableRowElement[] => {
  return rowElements.map((element: StudioCheckboxTableRowElement) =>
    element.value === selectedScope ? { ...element, checked: !element.checked } : element,
  );
};

export const getAllElementsChecked = (elements: StudioCheckboxTableRowElement[]): boolean => {
  return elements.every(
    (element: StudioCheckboxTableRowElement) => element.checked || element.disabled,
  );
};

export const getSomeElementsChecked = (elements: StudioCheckboxTableRowElement[]): boolean => {
  return elements.some((element: StudioCheckboxTableRowElement) => element.checked);
};

export const getAllElementsDisabled = (elements: StudioCheckboxTableRowElement[]): boolean => {
  return elements.every((scope: StudioCheckboxTableRowElement) => scope.disabled);
};

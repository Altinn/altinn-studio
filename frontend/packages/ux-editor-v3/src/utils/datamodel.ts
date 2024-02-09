import type { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';

/* UTIL METHODS FOR HANDLING DATA MODEL */
export function filterDataModelForIntellisense(
  dataModelElements: DatamodelFieldElement[],
  filterText: string,
): DatamodelFieldElement[] {
  if (!dataModelElements) {
    return [];
  }
  const rootElementFilterText = filterText.split('.')[0];
  const rootElementDataModel = dataModelElements[0].id.split('.')[0];
  if (rootElementFilterText.toLowerCase() !== rootElementDataModel.toLowerCase()) {
    filterText = filterText.replace(rootElementFilterText, rootElementDataModel);
  }

  const parentElement = filterText.substr(0, filterText.lastIndexOf('.')).toLowerCase();
  const currentElement = filterText.endsWith('.')
    ? null
    : filterText.substr(filterText.lastIndexOf('.') + 1, filterText.length).toLowerCase();

  if (currentElement) {
    return dataModelElements.filter(
      (element: DatamodelFieldElement) =>
        (element.type === 'Field' || element.type === 'Group') &&
        element.parentElement &&
        element.parentElement.toLowerCase() === parentElement &&
        element.name.toLowerCase().startsWith(currentElement),
    );
  }

  return dataModelElements.filter(
    (element: DatamodelFieldElement) =>
      (element.type === 'Field' || element.type === 'Group') &&
      element.parentElement &&
      element.parentElement.toLowerCase() === parentElement,
  );
}

export const getMinOccursFromDataModel = (
  dataBindingName: string,
  dataModel: DatamodelFieldElement[],
): number => {
  const element: DatamodelFieldElement = dataModel.find(
    (e: DatamodelFieldElement) => e.dataBindingName === dataBindingName,
  );
  return element?.minOccurs;
};

export const getXsdDataTypeFromDataModel = (
  dataBindingName: string,
  dataModel: DatamodelFieldElement[],
): string => {
  const element: DatamodelFieldElement = dataModel.find((e: DatamodelFieldElement) => {
    return e.dataBindingName === dataBindingName;
  });

  return element?.xsdValueType;
};

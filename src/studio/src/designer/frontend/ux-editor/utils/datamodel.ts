import type { IDataModelFieldElement } from '../types/global';

/* UTIL METHODS FOR HANDLING DATA MODEL */
export function filterDataModelForIntellisense(
  dataModelElements: IDataModelFieldElement[],
  filterText: string
): IDataModelFieldElement[] {
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
      (element: IDataModelFieldElement) =>
        (element.type === 'Field' || element.type === 'Group') &&
        element.parentElement &&
        element.parentElement.toLowerCase() === parentElement &&
        element.name.toLowerCase().startsWith(currentElement)
    );
  }

  return dataModelElements.filter(
    (element: IDataModelFieldElement) =>
      (element.type === 'Field' || element.type === 'Group') &&
      element.parentElement &&
      element.parentElement.toLowerCase() === parentElement
  );
}

export const getMinOccursFromDataModel = (dataBindingName: string, dataModel: IDataModelFieldElement[]): number => {
  const parentComponent = dataBindingName
    .replace('.value', '')
    .replace(/\./, '/');
  const element: IDataModelFieldElement = dataModel.find(
    (e: IDataModelFieldElement) => {
      return e.xPath === `/${parentComponent}`;
    },
  );
  return element?.minOccurs;
};

export const getXsdDataTypeFromDataModel = (dataBindingName: string, dataModel: IDataModelFieldElement[]): string => {
  const element: IDataModelFieldElement = dataModel.find(
    (e: IDataModelFieldElement) => {
      return e.dataBindingName === dataBindingName;
    },
  );

  return element?.xsdValueType;
}

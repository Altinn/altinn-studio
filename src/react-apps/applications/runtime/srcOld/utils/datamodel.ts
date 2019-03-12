/* UTIL METHODS FOR HANDLING DATA MODEL */

export function getParentGroup(
  dataModelElements: any,
  elementName: string,
): string {
  if (!dataModelElements) {
    return undefined;
  }

  let repeatingParentGroup: string;
  const parentElementPath = dataModelElements[elementName].ParentElement;
  const parentElement = dataModelElements[parentElementPath];
  if (!parentElement.ParentElement) {
    return undefined;
  }

  if (parentElement.MaxOccurs <= 1) {
    repeatingParentGroup = getParentGroup(dataModelElements, parentElement.ID);
  } else {
    repeatingParentGroup = parentElement.ID;
  }

  return repeatingParentGroup;
}

export function filterDataModelForIntellisense(
  dataModelElements: IDataModelFieldElement[],
  filterText: string,
  ): IDataModelFieldElement[] {
  if (!dataModelElements) {
    return [];
  }
  const rootElementFilterText = filterText.split('.')[0];
  const rootElementDataModel = dataModelElements[0].ID.split('.')[0];
  if (rootElementFilterText.toLowerCase() !== rootElementDataModel.toLowerCase()) {
    filterText = filterText.replace(rootElementFilterText, rootElementDataModel);
  }

  const parentElement = filterText.substr(0, filterText.lastIndexOf('.')).toLowerCase();
  const currentElement = filterText.endsWith('.') ? null :
    filterText.substr(filterText.lastIndexOf('.') + 1, filterText.length).toLowerCase();

  if (currentElement) {
    return dataModelElements.filter(
      (element: IDataModelFieldElement) =>
        (element.Type === 'Field'
        || element.Type === 'Group')
        && element.ParentElement
        && element.ParentElement.toLowerCase() === parentElement
        && element.Name.toLowerCase().startsWith(currentElement),
      );
  }

  return dataModelElements.filter(
    (element: IDataModelFieldElement) =>
      (element.Type === 'Field' || element.Type === 'Group')
        && element.ParentElement
        && element.ParentElement.toLowerCase() === parentElement,
      );
}

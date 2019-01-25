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
  parentElement: string,
  ): IDataModelFieldElement[] {
  if (!dataModelElements) {
    return [];
  }
  return dataModelElements.filter(
    (element: IDataModelFieldElement) => (element.Type === 'Field' || element.Type === 'Group') && element.ParentElement === parentElement);
}

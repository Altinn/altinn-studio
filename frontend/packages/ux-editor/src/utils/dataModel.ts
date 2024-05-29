import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';
import { ComponentType } from 'app-shared/types/ComponentType';

/* UTIL METHODS FOR HANDLING DATA MODEL */
export function filterDataModelForIntellisense(
  dataModelElements: DataModelFieldElement[],
  filterText: string,
): DataModelFieldElement[] {
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
      (element: DataModelFieldElement) =>
        (element.type === 'Field' || element.type === 'Group') &&
        element.parentElement &&
        element.parentElement.toLowerCase() === parentElement &&
        element.name.toLowerCase().startsWith(currentElement),
    );
  }

  return dataModelElements.filter(
    (element: DataModelFieldElement) =>
      (element.type === 'Field' || element.type === 'Group') &&
      element.parentElement &&
      element.parentElement.toLowerCase() === parentElement,
  );
}

export const getMinOccursFromDataModel = (
  dataBindingName: string,
  dataModel: DataModelFieldElement[],
): number => {
  const element: DataModelFieldElement = dataModel.find(
    (e: DataModelFieldElement) => e.dataBindingName === dataBindingName,
  );
  return element?.minOccurs;
};

export const getMaxOccursFromDataModel = (
  dataBindingName: string,
  dataModel: DataModelFieldElement[],
): number => {
  const element: DataModelFieldElement = dataModel.find((e: DataModelFieldElement) => {
    return e.dataBindingName === dataBindingName;
  });
  return element?.maxOccurs;
};

export const getXsdDataTypeFromDataModel = (
  dataBindingName: string,
  dataModel: DataModelFieldElement[],
): string => {
  const element: DataModelFieldElement = dataModel.find((e: DataModelFieldElement) => {
    return e.dataBindingName === dataBindingName;
  });

  return element?.xsdValueType;
};

const generalFilter = (element: DataModelFieldElement) =>
  element.dataBindingName && element.maxOccurs <= 1;
const repeatingGroupFilter = (element: DataModelFieldElement) =>
  element.dataBindingName && element.maxOccurs > 1;
const multipleAttachmentsFilter = (element: DataModelFieldElement) =>
  element.dataBindingName && element.maxOccurs > 1 && element.xsdValueType === 'String';

export const getDataModelFieldsFilter = (
  componentType: ComponentType,
  label: boolean,
): ((element: DataModelFieldElement) => boolean) => {
  switch (componentType) {
    case ComponentType.RepeatingGroup:
      return repeatingGroupFilter;
    case ComponentType.FileUpload:
    case ComponentType.FileUploadWithTag:
      return label ? multipleAttachmentsFilter : generalFilter;
    default:
      return generalFilter;
  }
};

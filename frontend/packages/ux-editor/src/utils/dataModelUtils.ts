import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { IDataModelBindings } from '../types/global';

export const getMinOccursFromDataModelFields = (
  dataBindingName: string,
  dataModelFields: DataModelFieldElement[],
): boolean => {
  const element: DataModelFieldElement = dataModelFields.find(
    (e: DataModelFieldElement) => e.dataBindingName === dataBindingName,
  );
  return element?.minOccurs > 0 || undefined;
};

export const getMaxOccursFromDataModelFields = (
  componentType: ComponentType,
  dataBindingName: string,
  dataModelFields: DataModelFieldElement[],
): number => {
  if (componentType === ComponentType.RepeatingGroup) {
    const element = dataModelFields.find(
      (e: DataModelFieldElement) => e.dataBindingName === dataBindingName,
    );
    return element?.maxOccurs;
  }

  return undefined;
};

export const getXsdDataTypeFromDataModelFields = (
  componentType: ComponentType,
  dataBindingName: string,
  dataModelFields: DataModelFieldElement[],
): string | undefined => {
  if (componentType === ComponentType.Datepicker) {
    const element = dataModelFields.find(
      (e: DataModelFieldElement) => e.dataBindingName === dataBindingName,
    );
    return element?.xsdValueType === 'DateTime' ? 'DateTime' : undefined;
  }

  return undefined;
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

export type DataModelField = {
  value: string;
  label: string;
};

export const filterDataModelFields = (
  getDataModelFieldsFilter: (element: DataModelFieldElement) => boolean,
  data: DataModelFieldElement[],
): DataModelField[] => {
  if (!data) {
    return [];
  }
  return data.filter(getDataModelFieldsFilter).map((element) => ({
    value: element.dataBindingName,
    label: element.dataBindingName,
  }));
};

type DataModelFields = {
  componentType: ComponentType;
  bindingKey: string;
  dataModelMetadata: DataModelFieldElement[];
};

export const getDataModelFields = ({
  componentType,
  bindingKey,
  dataModelMetadata,
}: DataModelFields): DataModelField[] => {
  const filter = getDataModelFieldsFilter(componentType, bindingKey === 'list');
  return filterDataModelFields(filter, dataModelMetadata);
};

export type InternalBindingFormat = {
  field: string | undefined;
  dataType: string | undefined;
};

export const convertDataBindingToInternalFormat = (
  dataModelBindings: IDataModelBindings,
  bindingKey: string,
): InternalBindingFormat => {
  const dataModelBinding =
    dataModelBindings && bindingKey in dataModelBindings
      ? dataModelBindings[bindingKey]
      : undefined;

  const isOldFormatOrNotSet =
    typeof dataModelBinding === 'string' || typeof dataModelBinding === 'undefined';

  if (isOldFormatOrNotSet) {
    return {
      field: dataModelBinding,
      dataType: '',
    };
  }
  return dataModelBinding;
};

export const validateSelectedDataModel = (
  selectedDataModel: string,
  dataModels: string[],
): boolean =>
  dataModels?.some((dataModel) => dataModel === selectedDataModel) ||
  selectedDataModel === '' ||
  selectedDataModel === undefined;

export const validateSelectedDataField = (
  selectedDataField: string,
  dataFields: DataModelField[],
): boolean =>
  dataFields?.some((dataField) => dataField.value === selectedDataField) ||
  selectedDataField === '' ||
  selectedDataField === undefined;

export const getDataModel = (
  isDataModelValid: boolean,
  defaultDataModelName: string | undefined,
  currentDataModel?: string,
): string => {
  if (defaultDataModelName) {
    return isDataModelValid && currentDataModel !== undefined && currentDataModel !== ''
      ? currentDataModel
      : defaultDataModelName;
  }
  return currentDataModel;
};

import { IApplication, IInstance } from '../types';

export const getCurrentTaskDataTypeId = (appMetadata: IApplication, instance: IInstance) => {
  const defaultDatatype = appMetadata.dataTypes.find((element) => element.appLogic !== null);
  const currentTaskDataType = instance.data.find((element) => element.dataType === defaultDatatype.id);
  return currentTaskDataType.id;
};

export const getCurrentTaskData = (appMetadata: IApplication, instance: IInstance) => {
  const defaultDatatype = appMetadata.dataTypes.find((element) => element.appLogic !== null);
  return instance.data.find((element) => element.dataType === defaultDatatype.id);
};

import { IApplication } from './../types';
import { IInstance } from './../types';

export const getCurrentTaskDataTypeId = (appMetaData: IApplication, instance: IInstance) => {
  const defaultDatatype = appMetaData.dataTypes.find((element) => element.appLogic !== null);
  const currentTaskDataType = instance.data.find((element) => element.dataType === defaultDatatype.id);
  return currentTaskDataType.id;
};

export const getCurrentTaskData = (appMetaData: IApplication, instance: IInstance) => {
  const defaultDatatype = appMetaData.dataTypes.find((element) => element.appLogic !== null);
  return instance.data.find((element) => element.dataType === defaultDatatype.id);
};

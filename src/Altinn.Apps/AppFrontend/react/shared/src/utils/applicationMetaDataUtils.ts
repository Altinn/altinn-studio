import { IApplication } from '../types';
import { IInstance } from '../types';

export const getCurrentTaskDataElementId = (appMetaData: IApplication, instance: IInstance) => {
  const currentTaskId = instance.process.currentTask.elementId;
  const appLogicDataType =
    appMetaData.dataTypes.find((element) => element.appLogic !== null && element.taskId === currentTaskId);
  const currentTaskDataElement = instance.data.find((element) => element.dataType === appLogicDataType.id);
  return currentTaskDataElement.id;
};

export const getCurrentTaskData = (appMetaData: IApplication, instance: IInstance) => {
  const defaultDatatype = appMetaData.dataTypes.find((element) => element.appLogic !== null);
  return instance.data.find((element) => element.dataType === defaultDatatype.id);
};

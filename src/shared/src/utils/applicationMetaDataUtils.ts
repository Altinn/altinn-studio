import type { IApplication, IInstance } from '../types';

export const getCurrentTaskData = (appMetaData: IApplication, instance: IInstance) => {
  const defaultDatatype = appMetaData.dataTypes.find(
    (element) => element.appLogic !== null && element.appLogic?.classRef !== null,
  );
  return instance.data.find((element) => element.dataType === defaultDatatype?.id);
};

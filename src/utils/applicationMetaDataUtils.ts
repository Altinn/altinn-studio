import type { IApplication, IInstance } from 'src/types/shared';

export const getCurrentTaskData = (appMetaData: IApplication, instance: IInstance) => {
  const defaultDatatype = appMetaData.dataTypes.find(
    (element) => element.appLogic !== null && element.appLogic?.classRef !== null,
  );
  return instance.data.find((element) => element.dataType === defaultDatatype?.id);
};

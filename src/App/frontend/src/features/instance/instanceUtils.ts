import { getApplicationMetadata } from 'src/features/applicationMetadata';
import type { UiFolders } from 'src/features/form/layoutSets/types';
import type { IData, IInstance } from 'src/types/shared';

// Even though the process state is part of the instance data we fetch from the server, we don't want to expose it
// to the rest of the application. This is because the process state is also fetched separately, and that
// is the one we want to use, as it contains more information about permissions than the instance data provides.
export function removeProcessFromInstance(instance: IInstance & { process?: unknown }): IInstance {
  const { process: _process, ...rest } = instance;
  return rest;
}

interface CommonProps {
  isStateless: boolean;
  uiFolders: UiFolders;
  taskId: string | undefined;
}
interface GetCurrentTaskDataElementIdProps extends CommonProps {
  dataElements: IData[];
}

export const getCurrentTaskDataElementId = (props: GetCurrentTaskDataElementIdProps) => {
  const currentDataTypeId = getCurrentDataTypeForApplication(props);
  const currentTaskDataElement = props.dataElements.find((element) => element.dataType === currentDataTypeId);
  return currentTaskDataElement?.id;
};

export function getFirstDataElementId(dataElements: IData[], dataType: string) {
  const elements = dataElements.filter((element) => element.dataType === dataType);
  if (elements.length > 1) {
    window.logWarnOnce(
      `Found multiple data elements with data type ${dataType} in instance, cannot determine which one to use`,
    );
    return undefined;
  }

  return elements.length > 0 ? elements[0].id : undefined;
}

/**
 * Get the current data type for the application
 */
export function getCurrentDataTypeForApplication({ isStateless, uiFolders, taskId }: CommonProps): string | undefined {
  const showOnEntry = getApplicationMetadata().onEntry.show;
  if (isStateless) {
    // we have a stateless app with a layout set
    return getDataTypeByUiFolderId({ uiFolderId: showOnEntry, uiFolders });
  }

  // Instance - get data element based on current process step
  if (taskId == null) {
    return undefined;
  }

  return getDataTypeByTaskId({ taskId, uiFolders });
}

interface GetDataTypeByTaskIdProps {
  taskId: string | undefined;
  uiFolders: UiFolders;
}

export function getDataTypeByTaskId({ taskId, uiFolders }: GetDataTypeByTaskIdProps) {
  const application = getApplicationMetadata();
  if (!taskId) {
    return undefined;
  }

  const typeFromLayoutSet = uiFolders[taskId]?.defaultDataType;
  const foundInMetaData = application?.dataTypes.find((element) => element.id === typeFromLayoutSet);
  if (typeFromLayoutSet && !foundInMetaData) {
    window.logError(
      `Could not find data type '${typeFromLayoutSet}' from ui folder configuration in application metadata`,
    );
  }
  if (typeFromLayoutSet && foundInMetaData) {
    return typeFromLayoutSet;
  }

  const firstInTask = application?.dataTypes.find(
    (element) => element.appLogic?.classRef && element.taskId === taskId,
  )?.id;

  if (firstInTask) {
    return firstInTask;
  }

  return undefined;
}

interface GetDataTypeByLayoutSetIdProps {
  uiFolderId: string | undefined;
  uiFolders: UiFolders;
}

export function getDataTypeByUiFolderId({ uiFolderId, uiFolders }: GetDataTypeByLayoutSetIdProps) {
  const appMetaData = getApplicationMetadata();
  const typeFromLayoutSet = uiFolderId ? uiFolders[uiFolderId]?.defaultDataType : undefined;
  if (typeFromLayoutSet && appMetaData?.dataTypes.find((element) => element.id === typeFromLayoutSet)) {
    return typeFromLayoutSet;
  }

  return undefined;
}

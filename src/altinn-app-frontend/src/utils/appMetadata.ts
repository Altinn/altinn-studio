import { getLayoutsetForDataElement } from 'src/utils/layout';
import type { ILayoutSets } from 'src/types';

import { getInstanceIdRegExp } from 'altinn-shared/utils';
import type { IApplication, IDataType, IInstance } from 'altinn-shared/types';

export function getDataTaskDataTypeId(
  taskId: string,
  dataTypes: IDataType[],
): string {
  if (!dataTypes || dataTypes.length === 0) {
    return null;
  }

  const result = dataTypes.find((dataType) => {
    return dataType.appLogic?.classRef && dataType.taskId === taskId;
  });
  return result?.id;
}

export function getDataTypeByLayoutSetId(
  layoutSetId: string,
  layoutSets: ILayoutSets,
) {
  return layoutSets?.sets.find((set) => set.id === layoutSetId)?.dataType;
}

/**
 * Application metadata onEntry.show values that have a state full application
 */
export const onEntryValuesThatHaveState: string[] = [
  'new-instance',
  'select-instance',
  'start-page',
];

/**
 * Get the current layout set for application if it exists
 * @param application the application metadata
 * @param instance the instance if present
 * @param layoutSets the layout sets if present
 * @returns the layout set for the application if present
 */
export function getLayoutSetIdForApplication(
  application: IApplication,
  instance?: IInstance,
  layoutSets?: ILayoutSets,
): string {
  const showOnEntry: string = application?.onEntry?.show;
  if (isStatelessApp(application)) {
    // we have a stateless app with a layout set
    return showOnEntry;
  }

  // instance - get layoutset based on current data task
  if (!layoutSets) {
    return null;
  }
  const dataType = getDataTaskDataTypeId(
    instance.process.currentTask.elementId,
    application.dataTypes,
  );
  return getLayoutsetForDataElement(instance, dataType, layoutSets);
}

interface IGetDataTypeForApplicationParams {
  application: IApplication;
  instance?: IInstance;
  layoutSets?: ILayoutSets;
}

/**
 * Get the current data type for the application
 * @param application the application metadata
 * @param instance the instance, if present
 * @param layoutSets the layout sets, if present
 * @returns the current data type
 */
export function getCurrentDataTypeForApplication({
  application,
  instance,
  layoutSets,
}: IGetDataTypeForApplicationParams): string {
  const showOnEntry: string = application?.onEntry?.show;
  if (isStatelessApp(application)) {
    // we have a stateless app with a layout set
    return getDataTypeByLayoutSetId(showOnEntry, layoutSets);
  }

  // instance - get data element based on current process step
  return getDataTaskDataTypeId(
    instance.process.currentTask.elementId,
    application.dataTypes,
  );
}

export function isStatelessApp(application: IApplication) {
  const url = window.location.href; // This should probably be reconsidered when changing router.
  const expr = getInstanceIdRegExp({ prefix: '/instance' });
  const match = url.match(expr);
  if (match) {
    // app can be setup as stateless but then go over to a statefull app
    return false;
  }
  const show = application?.onEntry?.show;
  return show && !onEntryValuesThatHaveState.includes(show);
}

export const getCurrentTaskDataElementId = (
  appMetaData: IApplication,
  instance: IInstance,
) => {
  const currentTaskId = instance.process.currentTask.elementId;
  const appLogicDataType = appMetaData.dataTypes.find(
    (element) => element.appLogic?.classRef && element.taskId === currentTaskId,
  );
  const currentTaskDataElement = instance.data.find(
    (element) => element.dataType === appLogicDataType.id,
  );
  return currentTaskDataElement.id;
};

export const getCurrentTaskData = (
  appMetaData: IApplication,
  instance: IInstance,
) => {
  const currentTaskId = instance.process.currentTask.elementId;
  const currentDataType = appMetaData.dataTypes.find(
    (element) => element.appLogic !== null && element.taskId === currentTaskId,
  );
  return instance.data.find(
    (element) => element.dataType === currentDataType.id,
  );
};

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import { getLayoutsetForDataElement } from 'src/utils/layout';
import type { ILayoutSets } from 'src/types';
import type { IApplication, IInstance } from 'src/types/shared';

export function getDataTypeByLayoutSetId(
  layoutSetId: string | undefined,
  layoutSets: ILayoutSets | undefined | null,
  appMetaData: IApplication | null,
) {
  const typeFromLayoutSet = layoutSets?.sets.find((set) => set.id === layoutSetId)?.dataType;
  if (typeFromLayoutSet && appMetaData?.dataTypes.find((element) => element.id === typeFromLayoutSet)) {
    return typeFromLayoutSet;
  }

  return undefined;
}

export function getDataTypeByTaskId(
  taskId: string | undefined,
  application: IApplication | null,
  layoutSets: ILayoutSets | null | undefined,
) {
  if (!taskId) {
    return undefined;
  }

  const typeFromLayoutSet = layoutSets?.sets.find((set) => set.tasks?.includes(taskId))?.dataType;
  const foundInMetaData = application?.dataTypes.find((element) => element.id === typeFromLayoutSet);
  if (typeFromLayoutSet && !foundInMetaData) {
    window.logError(
      `Could not find data type '${typeFromLayoutSet}' from layout-set configuration in application metadata`,
    );
  }
  if (typeFromLayoutSet && foundInMetaData) {
    return typeFromLayoutSet;
  }

  const firstInTask = application?.dataTypes.find((element) => element.appLogic?.classRef && element.taskId === taskId)
    ?.id;
  if (firstInTask) {
    return firstInTask;
  }

  return undefined;
}

/**
 * Application metadata onEntry.show values that have a state full application
 */
export const onEntryValuesThatHaveState: string[] = ['new-instance', 'select-instance', 'start-page'];

/**
 * Get the current layout set for application if it exists
 * @param application the application metadata
 * @param instance the instance if present
 * @param layoutSets the layout sets if present
 * @returns the layout set for the application if present
 */
export function getLayoutSetIdForApplication(
  application: IApplication | null,
  instance: IInstance | null,
  layoutSets: ILayoutSets | null,
): string | undefined {
  if (!application) {
    return undefined;
  }

  const showOnEntry = application.onEntry?.show;
  if (isStatelessApp(application)) {
    // we have a stateless app with a layout set
    return showOnEntry;
  }

  // instance - get layoutset based on current data task
  if (!layoutSets) {
    return undefined;
  }

  const dataType = getCurrentDataTypeForApplication({ application, instance, layoutSets });
  return getLayoutsetForDataElement(instance, dataType, layoutSets);
}

interface IGetDataTypeForApplicationParams {
  application: IApplication | null;
  instance: IInstance | null;
  layoutSets: ILayoutSets | null;
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
}: IGetDataTypeForApplicationParams): string | undefined {
  const showOnEntry: string | undefined = application?.onEntry?.show;
  if (isStatelessApp(application)) {
    // we have a stateless app with a layout set
    return getDataTypeByLayoutSetId(showOnEntry, layoutSets, application);
  }

  // Instance - get data element based on current process step
  const currentTaskId = instance?.process?.currentTask?.elementId;
  if (currentTaskId === null || currentTaskId === undefined) {
    return undefined;
  }

  return getDataTypeByTaskId(currentTaskId, application, layoutSets);
}

export function isStatelessApp(application: IApplication | null) {
  const url = window.location.href; // This should probably be reconsidered when changing router.
  const expr = getInstanceIdRegExp({ prefix: '/instance' });
  const match = url?.match(expr);
  if (match) {
    // app can be setup as stateless but then go over to a statefull app
    return false;
  }
  const show = application?.onEntry?.show;
  return typeof show === 'string' && !onEntryValuesThatHaveState.includes(show);
}

export const getCurrentTaskDataElementId = (
  application: IApplication | null,
  instance: IInstance | null,
  layoutSets: ILayoutSets | null,
) => {
  const currentDataTypeId = getCurrentDataTypeForApplication({ application, instance, layoutSets });
  const currentTaskDataElement = (instance?.data || []).find((element) => element.dataType === currentDataTypeId);
  return currentTaskDataElement?.id;
};

export const getCurrentTaskData = (application: IApplication, instance: IInstance, layoutSets: ILayoutSets) => {
  const currentDataTypeId = getCurrentDataTypeForApplication({ application, instance, layoutSets });
  return instance.data.find((element) => element.dataType === currentDataTypeId);
};

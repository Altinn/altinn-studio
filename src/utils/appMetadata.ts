import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import { getLayoutsetForDataElement } from 'src/utils/layout';
import type { ILayoutSets } from 'src/types';
import type { IApplication, IInstance } from 'src/types/shared';

export function getDataTypeByLayoutSetId(layoutSetId: string | undefined, layoutSets: ILayoutSets | undefined | null) {
  return layoutSets?.sets.find((set) => set.id === layoutSetId)?.dataType;
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
  application: IApplication,
  instance?: IInstance | null,
  layoutSets?: ILayoutSets | null,
): string | undefined {
  const showOnEntry = application?.onEntry?.show;
  if (isStatelessApp(application)) {
    // we have a stateless app with a layout set
    return showOnEntry;
  }

  // instance - get layoutset based on current data task
  if (!layoutSets) {
    return undefined;
  }

  const dataType = getCurrentDataTypeId(application, instance, layoutSets);
  return getLayoutsetForDataElement(instance, dataType, layoutSets);
}

interface IGetDataTypeForApplicationParams {
  application: IApplication | null;
  instance?: IInstance | null;
  layoutSets?: ILayoutSets | null;
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
    return getDataTypeByLayoutSetId(showOnEntry, layoutSets);
  }

  // instance - get data element based on current process step
  return getCurrentDataTypeId(application, instance, layoutSets);
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
  appMetaData: IApplication | null,
  instance: IInstance | null,
  layoutSets: ILayoutSets | null,
) => {
  const currentDataTypeId = getCurrentDataTypeId(appMetaData, instance, layoutSets);
  const currentTaskDataElement = instance?.data.find((element) => element.dataType === currentDataTypeId);
  return currentTaskDataElement?.id;
};

export const getCurrentTaskData = (appMetaData: IApplication, instance: IInstance, layoutSets: ILayoutSets) => {
  const currentDataTypeId = getCurrentDataTypeId(appMetaData, instance, layoutSets);
  return instance.data.find((element) => element.dataType === currentDataTypeId);
};

/**
 * @deprecated Prefer getCurrentDataTypeForApplication() instead, as this function should be unexported - it does
 * not account for stateless apps.
 */
export const getCurrentDataTypeId = (
  appMetaData: IApplication | null,
  instance?: IInstance | null,
  layoutSets?: ILayoutSets | null,
) => {
  const currentTaskId = instance?.process?.currentTask?.elementId;
  if (currentTaskId === null || currentTaskId === undefined) {
    return undefined;
  }

  return (
    layoutSets?.sets.find((set) => set.tasks?.includes(currentTaskId))?.dataType ||
    appMetaData?.dataTypes.find((element) => element.appLogic?.classRef && element.taskId === currentTaskId)?.id
  );
};

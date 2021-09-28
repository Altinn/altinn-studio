import { IApplication, IInstance } from 'altinn-shared/types';
import { ILayoutSets } from 'src/types';
import { getLayoutsetForDataElement } from './layout';

export function getDataTaskDataTypeId(taskId: string, dataTypes: any[]): string {
  if (!dataTypes || dataTypes.length === 0) {
    return null;
  }

  const result = dataTypes.find((dataType) => {
    return dataType.appLogic !== null && dataType.taskId === taskId;
  });
  return result?.id;
}

export function getDataTypeByLayoutSetId(layoutSetId: string, layoutSets: ILayoutSets) {
  return layoutSets?.sets.find((set) => set.id === layoutSetId)?.dataType;
}

/**
 * Application metadata onEntry.show values that have a state full application
 */
export const onEntryValuesThatHaveState: string[] = [
  'new-instance',
  'instance-selection',
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
  if (showOnEntry && !onEntryValuesThatHaveState.includes(showOnEntry)) {
    // we have a stateless app with a layout set
    return showOnEntry;
  }

  // instance - get layoutset based on current data task
  if (!layoutSets) {
    return null;
  }
  const dataType = getDataTaskDataTypeId(instance.process.currentTask.elementId,
    application.dataTypes);
  return getLayoutsetForDataElement(instance, dataType, layoutSets);
}

/**
 * Get the current data type for the application
 * @param application the application metadata
 * @param instance the instance, if present
 * @param layoutSets the layout sets, if present
 * @returns the current data type
 */
export function getCurrentDataTypeForApplication(
  application: IApplication,
  instance?: IInstance,
  layoutSets?: ILayoutSets,
): string {
  const showOnEntry: string = application?.onEntry?.show;
  if (showOnEntry && !onEntryValuesThatHaveState.includes(showOnEntry)) {
    // we have a stateless app with a layout set
    return getDataTypeByLayoutSetId(showOnEntry, layoutSets);
  }

  // instance - get data element based on current process step
  return getDataTaskDataTypeId(instance.process.currentTask.elementId, application.dataTypes);
}

export function isStatelessApp(application: IApplication) {
  const show = application?.onEntry?.show;
  return show && !onEntryValuesThatHaveState.includes(show);
}

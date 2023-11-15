import { useAppSelector } from 'src/hooks/useAppSelector';
import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import { getLayoutSetForDataElement } from 'src/utils/layout';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { ILayoutSets } from 'src/types';
import type { IInstance, IProcess } from 'src/types/shared';

interface TheCommonThreeProps {
  application: IApplicationMetadata | null;
  process: IProcess | null | undefined;
  layoutSets: ILayoutSets | null;
}

interface TheCommonFourProps extends TheCommonThreeProps {
  instance: IInstance | null | undefined;
}

export function getDataTypeByLayoutSetId(
  layoutSetId: string | undefined,
  layoutSets: ILayoutSets | undefined | null,
  appMetaData: IApplicationMetadata | null,
) {
  const typeFromLayoutSet = layoutSets?.sets.find((set) => set.id === layoutSetId)?.dataType;
  if (typeFromLayoutSet && appMetaData?.dataTypes.find((element) => element.id === typeFromLayoutSet)) {
    return typeFromLayoutSet;
  }

  return undefined;
}

export function getDataTypeByTaskId(
  taskId: string | undefined,
  application: IApplicationMetadata | null,
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
export function getLayoutSetIdForApplication({
  application,
  layoutSets,
  process,
}: TheCommonThreeProps): string | undefined {
  if (!application) {
    return undefined;
  }

  const showOnEntry = application.onEntry?.show;
  if (isStatelessApp(application)) {
    // we have a stateless app with a layout set
    return showOnEntry;
  }

  // instance - get layoutSet based on current data task
  if (!layoutSets) {
    return undefined;
  }

  const dataType = getCurrentDataTypeForApplication({ application, process, layoutSets });
  return getLayoutSetForDataElement(process, dataType, layoutSets);
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
  process,
  layoutSets,
}: TheCommonThreeProps): string | undefined {
  const showOnEntry: string | undefined = application?.onEntry?.show;
  if (isStatelessApp(application)) {
    // we have a stateless app with a layout set
    return getDataTypeByLayoutSetId(showOnEntry, layoutSets, application);
  }

  // Instance - get data element based on current process step
  const currentTaskId = process?.currentTask?.elementId;
  if (currentTaskId === null || currentTaskId === undefined) {
    return undefined;
  }

  return getDataTypeByTaskId(currentTaskId, application, layoutSets);
}

export function isStatelessApp(application: IApplicationMetadata | null) {
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

export function useIsStatelessApp() {
  const application = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  return isStatelessApp(application);
}

export const getCurrentTaskDataElementId = (props: TheCommonFourProps) => {
  const currentDataTypeId = getCurrentDataTypeForApplication(props);
  const currentTaskDataElement = (props.instance?.data || []).find((element) => element.dataType === currentDataTypeId);
  return currentTaskDataElement?.id;
};

export const getCurrentTaskData = (props: TheCommonFourProps) => {
  const currentDataTypeId = getCurrentDataTypeForApplication(props);
  return props.instance?.data.find((element) => element.dataType === currentDataTypeId);
};

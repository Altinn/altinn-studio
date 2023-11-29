import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import { getLayoutSetForDataElement } from 'src/utils/layout';
import type { IApplicationMetadata, ShowTypes } from 'src/features/applicationMetadata/index';
import type { ILayoutSets } from 'src/types';
import type { IInstance, IProcess } from 'src/types/shared';

interface TheCommonThreeProps {
  application: IApplicationMetadata;
  process: IProcess | null | undefined;
  layoutSets: ILayoutSets;
}

interface TheCommonFourProps extends TheCommonThreeProps {
  instance: IInstance | null | undefined;
}

interface GetDataTypeByLayoutSetIdProps {
  layoutSetId: string | undefined;
  layoutSets: ILayoutSets;
  appMetaData: IApplicationMetadata;
}

export function getDataTypeByLayoutSetId({ layoutSetId, layoutSets, appMetaData }: GetDataTypeByLayoutSetIdProps) {
  const typeFromLayoutSet = layoutSets?.sets.find((set) => set.id === layoutSetId)?.dataType;
  if (typeFromLayoutSet && appMetaData?.dataTypes.find((element) => element.id === typeFromLayoutSet)) {
    return typeFromLayoutSet;
  }

  return undefined;
}

interface GetDataTypeByTaskIdProps {
  taskId: string | undefined;
  application: IApplicationMetadata;
  layoutSets: ILayoutSets;
}

export function getDataTypeByTaskId({ taskId, application, layoutSets }: GetDataTypeByTaskIdProps) {
  if (!taskId) {
    return undefined;
  }

  const typeFromLayoutSet = layoutSets.sets.find((set) => set.tasks?.includes(taskId))?.dataType;
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
export const onEntryValuesThatHaveState: ShowTypes[] = ['new-instance', 'select-instance'];

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
  const showOnEntry = application.onEntry?.show;
  if (isStatelessApp(application)) {
    // we have a stateless app with a layout set
    return getDataTypeByLayoutSetId({ layoutSetId: showOnEntry, layoutSets, appMetaData: application });
  }

  // Instance - get data element based on current process step
  const currentTaskId = process?.currentTask?.elementId;
  if (currentTaskId === null || currentTaskId === undefined) {
    return undefined;
  }

  return getDataTypeByTaskId({ taskId: currentTaskId, application, layoutSets });
}

export function isStatelessApp(application: IApplicationMetadata) {
  const url = window.location.href; // This should probably be reconsidered when changing router.
  const expr = getInstanceIdRegExp({ prefix: '/instance' });
  const match = url?.match(expr);
  if (match) {
    // App can be setup as stateless but then go over to a stateful process task
    return false;
  }
  const show = application.onEntry?.show;
  return typeof show === 'string' && !onEntryValuesThatHaveState.includes(show);
}

export function useIsStatelessApp() {
  const application = useApplicationMetadata();
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

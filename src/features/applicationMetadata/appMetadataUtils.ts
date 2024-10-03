import { ContextNotProvided } from 'src/core/contexts/context';
import { useLaxApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLaxLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { layoutSetIsDefault } from 'src/features/form/layoutSets/TypeGuards';
import { getLayoutSetForDataElement } from 'src/utils/layout';
import type { ApplicationMetadata, ShowTypes } from 'src/features/applicationMetadata/types';
import type { ILayoutSets } from 'src/layout/common.generated';
import type { IInstance } from 'src/types/shared';

interface CommonProps {
  application: ApplicationMetadata;
  layoutSets: ILayoutSets;
  taskId: string | undefined;
}

interface GetCurrentTaskDataElementIdProps extends CommonProps {
  instance: IInstance | null | undefined;
}

interface GetDataTypeByLayoutSetIdProps {
  layoutSetId: string | undefined;
  layoutSets: Omit<ILayoutSets, 'uiSettings'>;
  appMetaData: ApplicationMetadata;
}

export function getDataTypeByLayoutSetId({ layoutSetId, layoutSets, appMetaData }: GetDataTypeByLayoutSetIdProps) {
  const typeFromLayoutSet = layoutSets?.sets.find((set) => set.id === layoutSetId)?.dataType;
  if (typeFromLayoutSet && appMetaData?.dataTypes.find((element) => element.id === typeFromLayoutSet)) {
    return typeFromLayoutSet;
  }

  return undefined;
}

export function useDataTypeByLayoutSetId(layoutSetId: string | undefined) {
  const layoutSets = useLaxLayoutSets();
  const application = useLaxApplicationMetadata();

  if (layoutSets === ContextNotProvided || application === ContextNotProvided) {
    return undefined;
  }

  return getDataTypeByLayoutSetId({ layoutSetId, layoutSets, appMetaData: application });
}

interface GetDataTypeByTaskIdProps {
  taskId: string | undefined;
  application: ApplicationMetadata;
  layoutSets: ILayoutSets;
}

export function getDataTypeByTaskId({ taskId, application, layoutSets }: GetDataTypeByTaskIdProps) {
  if (!taskId) {
    return undefined;
  }

  const typeFromLayoutSet = layoutSets.sets.find((set) => {
    if (layoutSetIsDefault(set) && set.tasks?.length) {
      return set.tasks.includes(taskId);
    }
    return false;
  })?.dataType;
  const foundInMetaData = application?.dataTypes.find((element) => element.id === typeFromLayoutSet);
  if (typeFromLayoutSet && !foundInMetaData) {
    window.logError(
      `Could not find data type '${typeFromLayoutSet}' from layout-set configuration in application metadata`,
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

/**
 * Application metadata onEntry.show values that have a state full application
 */
export const onEntryValuesThatHaveState: ShowTypes[] = ['new-instance', 'select-instance'];

/**
 * Get the current layout set for application if it exists
 */
export function getCurrentLayoutSet({ application, layoutSets, taskId }: CommonProps) {
  if (application.isStatelessApp) {
    // We have a stateless app with a layout set
    return layoutSets.sets.find((set) => set.id === application.onEntry.show);
  }

  const dataType = getCurrentDataTypeForApplication({ application, layoutSets, taskId });
  return getLayoutSetForDataElement(taskId, dataType, layoutSets);
}

/**
 * Get the current data type for the application
 */
export function getCurrentDataTypeForApplication({ application, layoutSets, taskId }: CommonProps): string | undefined {
  const showOnEntry = application.onEntry.show;
  if (application.isStatelessApp) {
    // we have a stateless app with a layout set
    return getDataTypeByLayoutSetId({ layoutSetId: showOnEntry, layoutSets, appMetaData: application });
  }

  // Instance - get data element based on current process step
  if (taskId == null) {
    return undefined;
  }

  return getDataTypeByTaskId({ taskId, application, layoutSets });
}

export const getCurrentTaskDataElementId = (props: GetCurrentTaskDataElementIdProps) => {
  const currentDataTypeId = getCurrentDataTypeForApplication(props);
  const currentTaskDataElement = (props.instance?.data || []).find((element) => element.dataType === currentDataTypeId);
  return currentTaskDataElement?.id;
};

export function getFirstDataElementId(instance: IInstance | undefined, dataType: string) {
  const elements = (instance?.data ?? []).filter((element) => element.dataType === dataType);
  if (elements.length > 1) {
    window.logWarnOnce(
      `Found multiple data elements with data type ${dataType} in instance, cannot determine which one to use`,
    );
    return undefined;
  }

  return elements.length > 0 ? elements[0].id : undefined;
}

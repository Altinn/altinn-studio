import { processLayoutSettings } from 'src/features/form/layoutSettings/processLayoutSettings';
import { getUiFolderSettings } from 'src/features/form/ui';
import { TaskKeys } from 'src/routesBuilder';
import { isProcessTaskType, ProcessTaskType } from 'src/types';
import type { IProcess } from 'src/types/shared';

export interface ComputeStartUrlParams {
  instanceOwnerPartyId?: string;
  instanceGuid?: string;
  taskId?: string;
  mainPageKey?: string;
  componentId?: string;
  dataElementId?: string;
  queryKeys: string;
  firstPage?: string;
  forcedTaskId?: string;
  taskType: ProcessTaskType;
  isStateless: boolean;
}

export function computeStartUrl({
  instanceOwnerPartyId,
  instanceGuid,
  taskId,
  mainPageKey,
  componentId,
  dataElementId,
  queryKeys,
  firstPage,
  forcedTaskId,
  taskType,
  isStateless,
}: ComputeStartUrlParams): string {
  if (isStateless && firstPage) {
    return `/${firstPage}${queryKeys}`;
  }
  if (typeof forcedTaskId === 'string') {
    return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${forcedTaskId}${queryKeys}`;
  }
  if (taskType === ProcessTaskType.Archived) {
    return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${TaskKeys.ProcessEnd}${queryKeys}`;
  }
  if (taskType !== ProcessTaskType.Data && taskId !== undefined) {
    return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}${queryKeys}`;
  }
  const isSubformPage = !!mainPageKey;
  if (isSubformPage && taskId && mainPageKey && componentId && dataElementId && firstPage) {
    return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${mainPageKey}/${componentId}/${dataElementId}/${firstPage}${queryKeys}`;
  }
  if (taskId && firstPage) {
    return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${firstPage}${queryKeys}`;
  }
  if (taskId) {
    return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}${queryKeys}`;
  }
  return `/instance/${instanceOwnerPartyId}/${instanceGuid}${queryKeys}`;
}

export function getRawFirstPage(folderId: string | undefined): string | undefined {
  const settings = getUiFolderSettings(folderId);
  return processLayoutSettings(settings).order[0];
}

export function getTaskTypeForLoader(
  processData: IProcess | undefined,
  taskId: string | undefined,
  isStateless: boolean,
  uiFolders: Record<string, unknown>,
): ProcessTaskType {
  // Replicate the exact logic from useGetTaskTypeById:
  // If the taskId is found in processTasks OR matches currentTask, use currentTask.
  const task =
    (processData?.processTasks?.find((t) => t.elementId === taskId) ?? processData?.currentTask?.elementId === taskId)
      ? processData?.currentTask
      : undefined;

  if (isStateless || taskId === TaskKeys.CustomReceipt || (taskId && taskId in uiFolders)) {
    return ProcessTaskType.Data;
  }

  if (taskId === TaskKeys.ProcessEnd || processData?.ended) {
    return ProcessTaskType.Archived;
  }

  if (task?.elementType === 'ServiceTask') {
    return ProcessTaskType.Service;
  }

  const altinnTaskType = task?.altinnTaskType;
  if (altinnTaskType && isProcessTaskType(altinnTaskType)) {
    return altinnTaskType;
  }

  return ProcessTaskType.Unknown;
}

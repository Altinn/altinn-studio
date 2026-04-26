import { processLayoutSettings } from 'src/features/form/layoutSettings/processLayoutSettings';
import { getUiFolderSettings } from 'src/features/form/ui';
import { TaskKeys } from 'src/routesBuilder';
import { ProcessTaskType } from 'src/types';

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

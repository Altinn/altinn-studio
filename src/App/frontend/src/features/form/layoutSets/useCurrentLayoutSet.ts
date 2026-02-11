import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { getApplicationMetadata, useIsStateless } from 'src/features/applicationMetadata';
import { getUiFolders } from 'src/features/form/layoutSets';
import { getCurrentDataTypeForApplication } from 'src/features/instance/instanceUtils';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { useNavigationParam } from 'src/hooks/navigation';
import { getUiFolderIdForDataElement } from 'src/utils/layout';
import type { UiFolders } from 'src/features/form/layoutSets/types';

type UiFolder = {
  id: string;
  defaultDataType?: string;
};

/**
 * This is a variant that prefers the taskId from the URL. The alternative useCurrentLayoutSetId() and
 * useCurrentLayoutSet() will prefer the taskId from the current process state (i.e., where the process is right now,
 * not necessarily what the user is looking at right now).
 */
export function useLayoutSetIdFromUrl() {
  const taskId = useNavigationParam('taskId');
  return useCurrentLayoutSetId(taskId);
}

export function useCurrentLayoutSetId(taskId?: string) {
  return useCurrentLayoutSet(taskId)?.id;
}

export function useCurrentLayoutSet(_taskId?: string) {
  const uiFolders = getUiFolders();
  const processTaskId = useProcessTaskId();
  const isStateless = useIsStateless();
  const taskId = _taskId ?? processTaskId;
  const overriddenLayoutSetId = useTaskOverrides()?.layoutSetId;

  if (overriddenLayoutSetId) {
    return toUiFolder(overriddenLayoutSetId, uiFolders);
  }

  return getCurrentLayoutSet({ isStateless, uiFolders, taskId });
}

/**
 * Get the current layout set for application if it exists
 */
export function getCurrentLayoutSet({
  isStateless,
  uiFolders,
  taskId,
}: {
  isStateless: boolean;
  uiFolders: UiFolders;
  taskId: string | undefined;
}): UiFolder | undefined {
  const appMetadata = getApplicationMetadata();
  if (isStateless) {
    // We have a stateless app with a layout set
    return toUiFolder(appMetadata.onEntry.show, uiFolders);
  }

  const dataType = getCurrentDataTypeForApplication({ isStateless, uiFolders, taskId });
  const uiFolderId = getUiFolderIdForDataElement(taskId, dataType, uiFolders);
  return toUiFolder(uiFolderId, uiFolders);
}

function toUiFolder(id: string | undefined, uiFolders: UiFolders): UiFolder | undefined {
  if (!id) {
    return undefined;
  }
  const settings = uiFolders[id];
  if (!settings) {
    return undefined;
  }

  return { id, defaultDataType: settings.defaultDataType };
}

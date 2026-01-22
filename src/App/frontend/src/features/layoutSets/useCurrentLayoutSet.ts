import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { getApplicationMetadata, useIsStateless } from 'src/features/applicationMetadata';
import { getCurrentDataTypeForApplication } from 'src/features/instance/instanceUtils';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { getLayoutSets } from 'src/features/layoutSets';
import { useNavigationParam } from 'src/hooks/navigation';
import { getLayoutSetForDataElement } from 'src/utils/layout';
import type { ILayoutSet } from 'src/features/layoutSets/types';

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
  const layoutSets = getLayoutSets();
  const processTaskId = useProcessTaskId();
  const isStateless = useIsStateless();
  const taskId = _taskId ?? processTaskId;
  const overriddenLayoutSetId = useTaskOverrides()?.layoutSetId;

  if (overriddenLayoutSetId) {
    return layoutSets.find((set) => set.id === overriddenLayoutSetId);
  }

  return getCurrentLayoutSet({ isStateless, layoutSets, taskId });
}

/**
 * Get the current layout set for application if it exists
 */
export function getCurrentLayoutSet({
  isStateless,
  layoutSets,
  taskId,
}: {
  isStateless: boolean;
  layoutSets: ILayoutSet[];
  taskId: string | undefined;
}) {
  const appMetadata = getApplicationMetadata();
  if (isStateless) {
    // We have a stateless app with a layout set
    return layoutSets.find((set) => set.id === appMetadata.onEntry.show);
  }

  const dataType = getCurrentDataTypeForApplication({ isStateless, layoutSets, taskId });
  return getLayoutSetForDataElement(taskId, dataType, layoutSets);
}

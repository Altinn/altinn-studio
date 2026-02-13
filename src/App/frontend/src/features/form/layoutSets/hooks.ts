import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { getApplicationMetadata, useIsStateless } from 'src/features/applicationMetadata';
import { getUiFolderSettings } from 'src/features/form/layoutSets/index';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { useNavigationParam } from 'src/hooks/navigation';

/**
 * This is a variant that prefers the taskId from the URL. The alternative useCurrentUiFolderName()
 * will prefer the taskId from the current process state (i.e., where the process is right now,
 * not necessarily what the user is looking at right now).
 */
export function useCurrentUiFolderNameFromUrl() {
  const taskId = useNavigationParam('taskId');
  return useCurrentUiFolderName(taskId);
}

export function useCurrentUiFolderName(_taskId?: string): string | undefined {
  const overriddenUiFolder = useTaskOverrides()?.uiFolder;
  const applicationMetaData = getApplicationMetadata();
  const processTaskId = useProcessTaskId();
  const isStateless = useIsStateless();
  const fromStateless = isStateless ? applicationMetaData.onEntry.show : undefined;

  return overriddenUiFolder ?? _taskId ?? processTaskId ?? fromStateless;
}

export function useCurrentUiFolderSettings(_taskId?: string) {
  return getUiFolderSettings(useCurrentUiFolderName(_taskId));
}

export function useCurrentUiFolderSettingsFromUrl() {
  return getUiFolderSettings(useCurrentUiFolderNameFromUrl());
}

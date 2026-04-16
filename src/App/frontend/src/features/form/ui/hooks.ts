import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { getApplicationMetadata, useIsStateless } from 'src/features/applicationMetadata';
import { getUiFolderSettings } from 'src/features/form/ui/index';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { useNavigationParam } from 'src/hooks/navigation';

/**
 * This is a variant that prefers the taskId from the URL. The alternative useCurrentUiFolderName()
 * will prefer the taskId from the current process state (i.e., where the process is right now,
 * not necessarily what the user is looking at right now).
 */
export function useCurrentUiFolderNameFromUrl(): string | undefined {
  const fromUrl = useNavigationParam('taskId');
  const overridden = useTaskOverrides()?.uiFolder;
  const applicationMetaData = getApplicationMetadata();
  const isStateless = useIsStateless();
  const fromStateless = isStateless ? applicationMetaData.onEntry.show : undefined;

  return overridden ?? fromUrl ?? fromStateless;
}

export function useCurrentUiFolderName(): string | undefined {
  const overriddenUiFolder = useTaskOverrides()?.uiFolder;
  const applicationMetaData = getApplicationMetadata();
  const fromProcessCurrentTask = useProcessTaskId();
  const isStateless = useIsStateless();
  const fromStateless = isStateless ? applicationMetaData.onEntry.show : undefined;

  return overriddenUiFolder ?? fromProcessCurrentTask ?? fromStateless;
}

export function useCurrentUiFolderSettings() {
  return getUiFolderSettings(useCurrentUiFolderName());
}

export function useCurrentUiFolderSettingsFromUrl() {
  return getUiFolderSettings(useCurrentUiFolderNameFromUrl());
}

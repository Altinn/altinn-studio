import { ContextNotProvided } from 'src/core/contexts/context';
import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { useLaxApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getCurrentLayoutSet } from 'src/features/applicationMetadata/appMetadataUtils';
import { useLaxLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { useNavigationParam } from 'src/hooks/navigation';

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
  const application = useLaxApplicationMetadata();
  const layoutSets = useLaxLayoutSets();
  const processTaskId = useProcessTaskId();
  const taskId = _taskId ?? processTaskId;
  const overriddenLayoutSetId = useTaskOverrides()?.layoutSetId;

  if (application === ContextNotProvided || layoutSets === ContextNotProvided) {
    return undefined;
  }

  if (overriddenLayoutSetId) {
    return layoutSets.find((set) => set.id === overriddenLayoutSetId);
  }

  return getCurrentLayoutSet({ application, layoutSets, taskId });
}

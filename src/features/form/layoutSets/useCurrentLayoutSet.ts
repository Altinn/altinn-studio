import { ContextNotProvided } from 'src/core/contexts/context';
import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { useLaxApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getCurrentLayoutSet } from 'src/features/applicationMetadata/appMetadataUtils';
import { useLaxLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';

export function useCurrentLayoutSetId() {
  return useCurrentLayoutSet()?.id;
}

export function useCurrentLayoutSet() {
  const application = useLaxApplicationMetadata();
  const layoutSets = useLaxLayoutSets();
  const taskId = useProcessTaskId();
  const overriddenLayoutSetId = useTaskStore((state) => state.overriddenLayoutSetId);

  if (application === ContextNotProvided || layoutSets === ContextNotProvided) {
    return undefined;
  }

  if (overriddenLayoutSetId) {
    return layoutSets.find((set) => set.id === overriddenLayoutSetId);
  }

  return getCurrentLayoutSet({ application, layoutSets, taskId });
}

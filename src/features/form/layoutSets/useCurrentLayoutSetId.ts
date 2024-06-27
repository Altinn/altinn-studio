import { ContextNotProvided } from 'src/core/contexts/context';
import { useLaxApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getLayoutSetIdForApplication } from 'src/features/applicationMetadata/appMetadataUtils';
import { useLaxLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { useTaskStore } from 'src/layout/Summary2/taskIdStore';
import type { ILayoutSet } from 'src/layout/common.generated';

export function useCurrentLayoutSetId() {
  const application = useLaxApplicationMetadata();
  const layoutSets = useLaxLayoutSets();
  const taskId = useProcessTaskId();
  const { overriddenLayoutSetId } = useTaskStore(({ overriddenLayoutSetId }) => ({ overriddenLayoutSetId }));

  if (overriddenLayoutSetId) {
    return overriddenLayoutSetId;
  }

  if (application === ContextNotProvided || layoutSets === ContextNotProvided) {
    return undefined;
  }

  return getLayoutSetIdForApplication({ application, layoutSets, taskId });
}

export function useGetLayoutSetById(layoutSetId: string): ILayoutSet | undefined {
  const layoutSets = useLaxLayoutSets();
  if (layoutSets === ContextNotProvided) {
    return undefined;
  }

  return layoutSets.sets.find((layoutSet) => layoutSet.id === layoutSetId);
}

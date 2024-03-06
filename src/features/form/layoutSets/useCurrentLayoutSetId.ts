import { ContextNotProvided } from 'src/core/contexts/context';
import { useLaxApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getLayoutSetIdForApplication } from 'src/features/applicationMetadata/appMetadataUtils';
import { useLaxLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';

export function useCurrentLayoutSetId() {
  const application = useLaxApplicationMetadata();
  const layoutSets = useLaxLayoutSets();
  const taskId = useProcessTaskId();

  if (application === ContextNotProvided || layoutSets === ContextNotProvided) {
    return undefined;
  }

  return getLayoutSetIdForApplication({ application, layoutSets, taskId });
}

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getLayoutSetIdForApplication } from 'src/features/applicationMetadata/appMetadataUtils';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';

export function useCurrentLayoutSetId() {
  const application = useApplicationMetadata();
  const layoutSets = useLayoutSets();
  const taskId = useProcessTaskId();

  return getLayoutSetIdForApplication({ application, layoutSets, taskId });
}

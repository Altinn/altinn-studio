import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getLayoutSetIdForApplication } from 'src/features/applicationMetadata/appMetadataUtils';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';

export function useCurrentLayoutSetId() {
  const application = useApplicationMetadata();
  const layoutSets = useLayoutSets();
  const process = useLaxProcessData();

  return getLayoutSetIdForApplication({ application, layoutSets, process });
}

import { onEntryValuesThatHaveState } from 'src/features/applicationMetadata/appMetadataUtils';
import { useNavigationParam } from 'src/hooks/navigation';

export function useIsStateless() {
  const hasInstanceGuid = useNavigationParam('instanceGuid');
  const appMetadata = getApplicationMetadata();
  const show = appMetadata.onEntry.show;
  return hasInstanceGuid ? false : !!show && !onEntryValuesThatHaveState.includes(show);
}

export const getApplicationMetadata = () => window.altinnAppGlobalData.applicationMetadata;

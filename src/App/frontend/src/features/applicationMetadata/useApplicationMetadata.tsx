import { onEntryValuesThatHaveState } from 'src/features/applicationMetadata/appMetadataUtils';
import { useNavigationParam } from 'src/hooks/navigation';
import type { ApplicationMetadata, IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';

export function processApplicationMetadata(
  instanceGuid: string | undefined,
  data: IncomingApplicationMetadata,
): ApplicationMetadata {
  const onEntry = data.onEntry ?? { show: 'new-instance' };
  return {
    ...data,
    isValidVersion: true, // TODO: Add version check when we know the next version (v9 or v10?)
    onEntry,
    isStatelessApp: isStatelessApp(!!instanceGuid, onEntry.show),
    logoOptions: data.logo,
  };
}
function isStatelessApp(hasInstanceGuid: boolean, show: ApplicationMetadata['onEntry']['show']) {
  // App can be setup as stateless but then go over to a stateful process task
  return hasInstanceGuid ? false : !!show && !onEntryValuesThatHaveState.includes(show);
}

export const useApplicationMetadata = () => {
  const instanceGuid = useNavigationParam('instanceGuid');
  return processApplicationMetadata(instanceGuid, window.AltinnAppData.applicationMetadata);
};

export const useLaxApplicationMetadata = () => useApplicationMetadata();
export const useHasApplicationMetadata = () => true;

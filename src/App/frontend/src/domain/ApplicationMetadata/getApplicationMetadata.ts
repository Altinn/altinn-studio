import { onEntryValuesThatHaveState } from 'src/features/applicationMetadata/appMetadataUtils';
import { useNavigationParam } from 'src/hooks/navigation';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';

export const useApplicationMetadata = (): ApplicationMetadata => window.AltinnAppData.applicationMetadata;
export const useHasApplicationMetadata = () => true;

export const getApplicationMetadata = () => window.AltinnAppGlobalData.applicationMetadata;

export function isStatelessApp2(hasInstanceGuid: boolean) {
  const appMetadata = getApplicationMetadata();
  const show = appMetadata.onEntry?.show;
  return hasInstanceGuid ? false : !!show && !onEntryValuesThatHaveState.includes(show);
}

export const useIsStatelessApp = (): boolean => {
  const instanceGuid = useNavigationParam('instanceGuid');
  return isStatelessApp2(!!instanceGuid);
};

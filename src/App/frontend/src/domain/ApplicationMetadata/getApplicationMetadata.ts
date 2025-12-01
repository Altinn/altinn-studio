import { onEntryValuesThatHaveState } from 'src/features/applicationMetadata/appMetadataUtils';
import { useNavigationParam } from 'src/hooks/navigation';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';

export const getApplicationMetadata = (): ApplicationMetadata => window.AltinnAppGlobalData.applicationMetadata;
export const useHasApplicationMetadata = () => true;

export function isStatelessApp2(hasInstanceGuid: boolean) {
  const appMetadata = getApplicationMetadata();
  const show = appMetadata.onEntry?.show;
  return hasInstanceGuid ? false : !!show && !onEntryValuesThatHaveState.includes(show);
}

export const useIsStatelessApp = (): boolean => {
  const instanceGuid = useNavigationParam('instanceGuid');
  return isStatelessApp2(!!instanceGuid);
};

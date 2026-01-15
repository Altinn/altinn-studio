import { onEntryValuesThatHaveState } from 'src/features/applicationMetadata/appMetadataUtils';

export function useIsStateless() {
  const instancePattern = /^\/instance\/[^/]+\/[^/]+/;
  const hasInstanceGuid = instancePattern.test(window.location.pathname);
  const appMetadata = getApplicationMetadata();
  const show = appMetadata.onEntry.show;
  return hasInstanceGuid ? false : !!show && !onEntryValuesThatHaveState.includes(show);
}

export const getApplicationMetadata = () => window.altinnAppGlobalData.applicationMetadata;

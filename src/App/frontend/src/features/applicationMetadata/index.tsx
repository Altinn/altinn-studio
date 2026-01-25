import { useNavigationParam } from 'src/hooks/navigation';

export function getApplicationMetadata() {
  return globalThis.altinnAppGlobalData.applicationMetadata;
}

export function useIsStateless() {
  const hasInstanceGuid = useNavigationParam('instanceGuid');
  const appMetadata = getApplicationMetadata();
  const show = appMetadata.onEntry.show;
  return hasInstanceGuid ? false : !!show && !['new-instance', 'select-instance'].includes(show);
}

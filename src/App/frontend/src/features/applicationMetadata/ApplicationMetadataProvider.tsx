import { useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { onEntryValuesThatHaveState } from 'src/features/applicationMetadata/appMetadataUtils';
import { isMinimumApplicationVersion } from 'src/utils/versioning/versions';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';

function isStatelessApp(hasInstanceGuid: boolean, show: ApplicationMetadata['onEntry']['show']) {
  // App can be setup as stateless but then go over to a stateful process task
  return hasInstanceGuid ? false : !!show && !onEntryValuesThatHaveState.includes(show);
}

export const useApplicationMetadata = (): ApplicationMetadata =>
  useMemo(() => {
    const data = window.AltinnAppData.applicationMetadata;
    const onEntry = data.onEntry ?? { show: 'new-instance' };
    const instanceGuid = window.AltinnAppData.instance?.id;

    return {
      ...data,
      isValidVersion: isMinimumApplicationVersion(data.altinnNugetVersion),
      onEntry,
      isStatelessApp: isStatelessApp(!!instanceGuid, onEntry.show),
      logoOptions: data.logo,
    };
  }, []);

export const useLaxApplicationMetadata = (): ApplicationMetadata | typeof ContextNotProvided => {
  const metadata = useApplicationMetadata();
  try {
    return metadata;
  } catch {
    return ContextNotProvided;
  }
};

export const useHasApplicationMetadata = () => true;

// Legacy export for tests - just renders children since no provider needed
export function ApplicationMetadataProvider({ children }: PropsWithChildren) {
  return children;
}

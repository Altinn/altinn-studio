import { ContextNotProvided } from 'src/core/contexts/context';
import { useLaxApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { isStatelessApp } from 'src/features/applicationMetadata/appMetadataUtils';

export function useIsStatelessApp() {
  const application = useLaxApplicationMetadata();
  if (application === ContextNotProvided) {
    return false;
  }

  return isStatelessApp(application);
}

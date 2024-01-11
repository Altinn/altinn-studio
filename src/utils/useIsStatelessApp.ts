import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { isStatelessApp } from 'src/features/applicationMetadata/appMetadataUtils';

export function useIsStatelessApp() {
  const application = useApplicationMetadata();
  return isStatelessApp(application);
}

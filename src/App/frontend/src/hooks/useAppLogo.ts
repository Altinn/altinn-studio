import { useTextResourceOr } from 'src/core/texts/appTexts';
import { getApplicationMetadata } from 'src/features/applicationMetadata';

export function useAppLogoUrl() {
  const application = getApplicationMetadata();

  const useOrgAsSource = (application.logo?.source ?? 'org') === 'org';
  const fromOrg = useOrgAsSource ? window.altinnAppGlobalData?.orgLogoUrl : undefined;
  const fromTextResources = useTextResourceOr('appLogo.url', undefined);

  return fromOrg || fromTextResources;
}

export function useDisplayAppOwnerNameInHeader() {
  const application = getApplicationMetadata();
  return application.logo?.displayAppOwnerNameInHeader === true;
}

export function useAppLogoSize() {
  const application = getApplicationMetadata();
  const size = application.logo?.size;

  if (size !== 'small' && size !== 'medium' && size !== 'large') {
    return 'small';
  }
  return size;
}

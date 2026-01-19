import { useTextResourceOr } from 'src/core/texts/appTexts';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { useOrgs } from 'src/features/orgs/OrgsProvider';

export function useAppLogoUrl() {
  const orgs = useOrgs();
  const application = getApplicationMetadata();
  const org = application?.org;

  const useOrgAsSource = (application.logo?.source ?? 'org') === 'org';
  const fromOrg = useOrgAsSource && orgs && org ? orgs[org]?.logo : undefined;
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

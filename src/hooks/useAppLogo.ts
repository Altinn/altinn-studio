import { useTextResourceOr } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useOrgs } from 'src/features/orgs/OrgsProvider';

export function useAppLogoUrl() {
  const orgs = useOrgs();
  const application = useApplicationMetadata();
  const org = application?.org;

  const useOrgAsSource = (application.logo?.source ?? 'org') === 'org';
  const fromOrg = useOrgAsSource && orgs && org ? orgs[org]?.logo : undefined;
  const fromTextResources = useTextResourceOr('appLogo.url', undefined);

  return fromOrg || fromTextResources;
}

export function useDisplayAppOwnerNameInHeader() {
  const application = useApplicationMetadata();
  return application.logo?.displayAppOwnerNameInHeader ?? true;
}

export function useAppLogoSize() {
  const application = useApplicationMetadata();
  const size = application.logo?.size;

  if (size !== 'small' && size !== 'medium' && size !== 'large') {
    return 'small';
  }
  return size;
}

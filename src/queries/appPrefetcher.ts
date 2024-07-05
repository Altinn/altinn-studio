import { matchPath } from 'react-router-dom';

import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { useApplicationMetadataQueryDef } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useApplicationSettingsQueryDef } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useFooterLayoutQueryDef } from 'src/features/footer/FooterLayoutProvider';
import { useLayoutSetsQueryDef } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useInstanceDataQueryDef } from 'src/features/instance/InstanceContext';
import { useProcessQueryDef } from 'src/features/instance/ProcessContext';
import { useOrgsQueryDef } from 'src/features/orgs/OrgsProvider';
import { useCurrentPartyQueryDef, usePartiesQueryDef } from 'src/features/party/PartiesProvider';
import { useProfileQueryDef } from 'src/features/profile/ProfileProvider';

/**
 * Prefetches requests that require no processed data to determine the url
 * Only prefetches profile, parties, and current party if a partyId is present in the URL, this is to avoid 401 errors for anonymous apps
 * Only prefetches instance and process if a party- and instanceid is present in the URL
 */
export function AppPrefetcher() {
  const { partyId, instanceGuid } =
    matchPath({ path: '/instance/:partyId/:instanceGuid/*' }, window.location.hash.slice(1))?.params ?? {};
  const instanceId = partyId && instanceGuid ? `${partyId}/${instanceGuid}` : undefined;

  usePrefetchQuery(useApplicationMetadataQueryDef());
  usePrefetchQuery(useLayoutSetsQueryDef());
  usePrefetchQuery(useProfileQueryDef(true), Boolean(partyId));
  usePrefetchQuery(useOrgsQueryDef());
  usePrefetchQuery(useApplicationSettingsQueryDef());
  usePrefetchQuery(useFooterLayoutQueryDef());
  usePrefetchQuery(usePartiesQueryDef(true), Boolean(partyId));
  usePrefetchQuery(useCurrentPartyQueryDef(true), Boolean(partyId));

  usePrefetchQuery(useInstanceDataQueryDef(partyId, instanceGuid));
  usePrefetchQuery(useProcessQueryDef(instanceId));

  return null;
}

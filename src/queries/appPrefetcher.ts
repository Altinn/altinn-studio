import { matchPath } from 'react-router-dom';

import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { getApplicationMetadataQueryDef } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useApplicationSettingsQueryDef } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useLayoutSetsQueryDef } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useInstanceDataQueryDef } from 'src/features/instance/InstanceContext';
import { getProcessQueryDef } from 'src/features/instance/ProcessContext';
import { useOrgsQueryDef } from 'src/features/orgs/OrgsProvider';
import { useCurrentPartyQueryDef, usePartiesQueryDef } from 'src/features/party/PartiesProvider';
import { useProfileQueryDef } from 'src/features/profile/ProfileProvider';

/**
 * Prefetches requests that require no processed data to determine the url
 * Only prefetches profile, parties, and current party if a partyId is present in the URL, this is to avoid 401 errors for anonymous apps
 * Only prefetches instance and process if a party- and instanceid is present in the URL
 */
export function AppPrefetcher() {
  const { instanceOwnerPartyId, instanceGuid } =
    matchPath({ path: '/instance/:instanceOwnerPartyId/:instanceGuid/*' }, window.location.hash.slice(1))?.params ?? {};
  const instanceId = instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;

  usePrefetchQuery(getApplicationMetadataQueryDef(instanceGuid));
  usePrefetchQuery(useLayoutSetsQueryDef());
  usePrefetchQuery(useProfileQueryDef(true), Boolean(instanceOwnerPartyId));
  usePrefetchQuery(useOrgsQueryDef());
  usePrefetchQuery(useApplicationSettingsQueryDef());
  usePrefetchQuery(usePartiesQueryDef(true), Boolean(instanceOwnerPartyId));
  usePrefetchQuery(useCurrentPartyQueryDef(true), Boolean(instanceOwnerPartyId));

  usePrefetchQuery(useInstanceDataQueryDef(false, instanceOwnerPartyId, instanceGuid));
  usePrefetchQuery(getProcessQueryDef(instanceId));

  return null;
}

import { matchPath } from 'react-router-dom';

import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { getApplicationMetadataQueryDef } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useApplicationSettingsQueryDef } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useLayoutSetsQueryDef } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { instanceQueries } from 'src/features/instance/InstanceContext';
import { processQueries } from 'src/features/instance/useProcessQuery';
import { useOrgsQueryDef } from 'src/features/orgs/OrgsProvider';
import { usePartiesQueryDef, useSelectedPartyQueryDef } from 'src/features/party/PartiesProvider';

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
  usePrefetchQuery(useOrgsQueryDef());
  usePrefetchQuery(useApplicationSettingsQueryDef());
  usePrefetchQuery(usePartiesQueryDef(true), Boolean(instanceOwnerPartyId));
  usePrefetchQuery(useSelectedPartyQueryDef(true), Boolean(instanceOwnerPartyId));

  usePrefetchQuery(instanceQueries.instanceData({ instanceOwnerPartyId, instanceGuid }));
  usePrefetchQuery(processQueries.processState(instanceId));

  return null;
}

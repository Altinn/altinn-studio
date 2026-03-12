import { matchPath } from 'react-router';

import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { instanceQueries } from 'src/features/instance/InstanceContext';
import { usePartiesQueryDef } from 'src/features/party/PartiesProvider';

/**
 * Prefetches requests that require no processed data to determine the url
 * Only prefetches profile, parties, and current party if a partyId is present in the URL, this is to avoid 401 errors for anonymous apps
 * Only prefetches instance if a party- and instanceid is present in the URL.
 * Process data is included in the instance response and seeded into the process cache by InstanceProvider.
 */
export function AppPrefetcher() {
  const { instanceOwnerPartyId, instanceGuid } =
    matchPath({ path: '/instance/:instanceOwnerPartyId/:instanceGuid/*' }, window.location.hash.slice(1))?.params ?? {};

  usePrefetchQuery(usePartiesQueryDef(true), Boolean(instanceOwnerPartyId));
  usePrefetchQuery(instanceQueries.instanceData({ instanceOwnerPartyId, instanceGuid }));

  return null;
}

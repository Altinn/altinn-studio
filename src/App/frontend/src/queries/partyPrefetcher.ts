import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { usePartiesQueryDef, useSelectedPartyQueryDef } from 'src/features/party/PartiesProvider';
import { useShouldFetchProfile } from 'src/features/profile/ProfileProvider';

/**
 * Prefetches parties and current party if applicable
 */
export function PartyPrefetcher() {
  const enabled = useShouldFetchProfile();

  usePrefetchQuery(usePartiesQueryDef(true), enabled);
  usePrefetchQuery(useSelectedPartyQueryDef(true), enabled);

  return null;
}

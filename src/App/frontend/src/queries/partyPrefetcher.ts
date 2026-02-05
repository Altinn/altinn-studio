import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { usePartiesQueryDef, useSelectedPartyQueryDef } from 'src/features/party/PartiesProvider';
import { useIsAllowAnonymous } from 'src/features/stateless/getAllowAnonymous';

/**
 * Prefetches parties and current party if applicable
 */
export function PartyPrefetcher() {
  const allowAnonymous = useIsAllowAnonymous(false);
  usePrefetchQuery(usePartiesQueryDef(true), allowAnonymous);
  usePrefetchQuery(useSelectedPartyQueryDef(true), allowAnonymous);

  return null;
}

import { usePartyApi } from 'src/core/contexts/ApiProvider';
import { partiesAllowedToInstantiateQuery } from 'src/core/queries/party';
import { usePrefetchQuery } from 'src/core/queries/usePrefetchQuery';
import { useAllowAnonymous } from 'src/features/stateless/getAllowAnonymous';

/**
 * Prefetches parties and current party if applicable
 */
export function PartyPrefetcher() {
  const allowAnonymous = useAllowAnonymous();
  usePrefetchQuery(partiesAllowedToInstantiateQuery(usePartyApi(), { enabled: !allowAnonymous }));
  return null;
}

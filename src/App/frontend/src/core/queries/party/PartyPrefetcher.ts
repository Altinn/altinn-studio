import { useQuery } from '@tanstack/react-query';

import { usePartyApi } from 'src/core/contexts/ApiProvider';
import { partiesAllowedToInstantiateQuery } from 'src/core/queries/party/party.queries';
import { useAllowAnonymous } from 'src/features/stateless/getAllowAnonymous';

/**
 * Prefetches parties and current party if applicable
 */
export function PartyPrefetcher() {
  const allowAnonymous = useAllowAnonymous();
  useQuery({
    ...partiesAllowedToInstantiateQuery(usePartyApi(), { enabled: !allowAnonymous }),
    notifyOnChangeProps: [],
  });
  return null;
}

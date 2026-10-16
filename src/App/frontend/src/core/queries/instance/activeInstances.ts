import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useInstanceApi } from 'src/core/contexts/ApiProvider';
import { activeInstancesQuery } from 'src/core/queries/instance/instance.queries';
import { useSelectedParty } from 'src/features/party/PartiesProvider';

export const useActiveInstancesQuery = () => {
  const selectedParty = useSelectedParty();
  const instanceApi = useInstanceApi();
  const partyId = String(selectedParty?.partyId ?? '');

  const utils = useQuery({
    ...activeInstancesQuery({ partyId, instanceApi }),
    enabled: Boolean(selectedParty?.partyId),
  });

  useEffect(() => {
    utils.error && window.logError('Fetching active instances failed:\n', utils.error);
  }, [utils.error]);

  return { data: utils.data, isPending: utils.isPending, error: utils.error };
};

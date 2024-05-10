import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';

export const usePaymentInformationQuery = (partyId?: string, instanceGuid?: string) => {
  const enabled = !!partyId && !!instanceGuid;

  const { fetchPaymentInformation } = useAppQueries();
  const utils = useQuery({
    enabled,
    queryKey: ['fetchPaymentInfo'],
    queryFn: () => {
      if (enabled) {
        return fetchPaymentInformation(partyId, instanceGuid);
      }
    },
  });

  useEffect(() => {
    utils.error && window.logError('Fetching paymentInfo failed:\n', utils.error);
  }, [utils.error]);

  return {
    ...utils,
    enabled,
  };
};

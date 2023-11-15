import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { ApplicationMetadataActions } from 'src/features/applicationMetadata/applicationMetadataSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const useApplicationMetadataQuery = (): UseQueryResult<IApplicationMetadata> => {
  const dispatch = useAppDispatch();
  const { fetchApplicationMetadata } = useAppQueries();
  return useQuery(['fetchApplicationMetadata'], fetchApplicationMetadata, {
    onSuccess: (applicationMetadata) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(ApplicationMetadataActions.getFulfilled({ applicationMetadata }));
    },
    onError: (error: HttpClientError) => {
      // Update the Redux Store ensures that legacy code has access to the data without using the Tanstack Query Cache
      dispatch(ApplicationMetadataActions.getRejected({ error }));
      window.logError('Fetching application metadata failed:\n', error);
    },
  });
};

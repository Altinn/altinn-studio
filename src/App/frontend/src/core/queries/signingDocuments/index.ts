import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/queries/AppQueriesProvider';
import type { SigningDocument } from 'src/core/api-client/signing.api';
export type { SigningDocument };

export function useDocumentList(instanceOwnerPartyId: string | undefined, instanceGuid: string | undefined) {
  const { fetchSigningDocuments } = useAppQueries();
  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ['signingDocumentList', instanceOwnerPartyId, instanceGuid],
    queryFn: () => fetchSigningDocuments(instanceOwnerPartyId, instanceGuid),
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnMount: 'always',
  });
  return { data, error, isLoading, isFetching };
}

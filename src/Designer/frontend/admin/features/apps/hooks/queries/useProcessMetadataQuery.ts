import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export type ProcessTaskMetadata = {
  id: string;
  name?: string;
  dataTypeTags: ProcessDataTypeTag[];
};

export type ProcessDataTypeTag = {
  dataTypeId: string;
  tag:
    | 'signatureDataType'
    | 'signeeStatesDataTypeId'
    | 'signingPdfDataType'
    | 'paymentDataType'
    | 'paymentReceiptPdfDataType';
};

export const useProcessMetadataQuery = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<ProcessTaskMetadata[]> => {
  const { getProcessMetadata } = useServicesContext();
  return useQuery<ProcessTaskMetadata[]>({
    queryKey: [QueryKey.AppProcessMetadata, org, env, app],
    queryFn: async ({ signal }) => getProcessMetadata(org, env, app, signal),
  });
};

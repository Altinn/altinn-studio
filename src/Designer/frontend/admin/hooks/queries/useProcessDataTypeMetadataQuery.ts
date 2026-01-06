import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { processDataTypeMetadataPath } from 'admin/utils/apiPaths';

export type ProcessDataType =
  | 'signatureDataType'
  | 'signeeStatesDataTypeId'
  | 'signingPdfDataType'
  | 'paymentDataType'
  | 'paymentReceiptPdfDataType';

export const useProcessDataTypeMetadataQuery = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<Record<string, ProcessDataType>> => {
  return useQuery<Record<string, ProcessDataType>>({
    queryKey: [QueryKey.AppProcessDataTypeMetadata, org, env, app],
    queryFn: async ({ signal }) =>
      (
        await axios.get<Record<string, ProcessDataType>>(
          processDataTypeMetadataPath(org, env, app),
          {
            signal,
          },
        )
      ).data,
  });
};

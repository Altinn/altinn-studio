import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { processDataTypeMetadataPath } from 'admin/utils/apiPaths';

export type ProcessDataType = {
  dataTypeId: string;
  taskId: string;
  tag:
    | 'signatureDataType'
    | 'signeeStatesDataTypeId'
    | 'signingPdfDataType'
    | 'paymentDataType'
    | 'paymentReceiptPdfDataType';
};

export const useProcessDataTypesQuery = (
  org: string,
  env: string,
  app: string,
): UseQueryResult<ProcessDataType[]> => {
  return useQuery<ProcessDataType[]>({
    queryKey: [QueryKey.AppProcessDataTypes, org, env, app],
    queryFn: async ({ signal }) =>
      (
        await axios.get<ProcessDataType[]>(processDataTypeMetadataPath(org, env, app), {
          signal,
        })
      ).data,
  });
};

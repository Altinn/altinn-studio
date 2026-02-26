import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import axios from 'axios';
import { processMetadataPath } from 'admin/utils/apiPaths';

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
  return useQuery<ProcessTaskMetadata[]>({
    queryKey: [QueryKey.AppProcessMetadata, org, env, app],
    queryFn: async ({ signal }) =>
      (
        await axios.get<ProcessTaskMetadata[]>(processMetadataPath(org, env, app), {
          signal,
        })
      ).data,
  });
};

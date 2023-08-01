import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';
import { AxiosError } from 'axios';
import { mergeJsonAndXsdData } from '@altinn/schema-editor/utils/metadataUtils';

export const useDatamodelsMetadataQuery = (): UseQueryResult<DatamodelMetadata[], AxiosError> => {
  const { org, app } = useParams<{ org: string; app: string }>();
  const { getDatamodels, getDatamodelsXsd } = useServicesContext();
  return useQuery<DatamodelMetadata[], AxiosError>(
    [QueryKey.DatamodelsMetadata, org, app],
    async () => Promise.all([
      getDatamodels(org, app),
      getDatamodelsXsd(org, app),
    ]).then(([
      datamodelsJson,
      datamodelsXsd
    ]) => mergeJsonAndXsdData(datamodelsJson, datamodelsXsd))
  );
}

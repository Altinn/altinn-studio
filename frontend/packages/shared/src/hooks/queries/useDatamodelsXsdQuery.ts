import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { DatamodelMetadataXsd } from 'app-shared/types/DatamodelMetadata';
import { AxiosError } from 'axios';

export const useDatamodelsXsdQuery = (
  owner,
  app,
): UseQueryResult<DatamodelMetadataXsd[], AxiosError> => {
  const { getDatamodelsXsd } = useServicesContext();
  return useQuery<DatamodelMetadataXsd[], AxiosError>({
    queryKey: [QueryKey.DatamodelsXsd, owner, app],
    queryFn: () => getDatamodelsXsd(owner, app),
  });
};

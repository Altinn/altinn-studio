import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { DatamodelMetadataJson } from 'app-shared/types/DatamodelMetadata';
import { AxiosError } from 'axios';

export const useDatamodelsJsonQuery = (owner, app): UseQueryResult<DatamodelMetadataJson[], AxiosError> => {
  const { getDatamodels } = useServicesContext();
  return useQuery<DatamodelMetadataJson[], AxiosError>(
    [QueryKey.DatamodelsJson, owner, app],
    () => getDatamodels(owner, app),
  );
};

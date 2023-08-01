import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';

export const useDatamodelsXsdQuery = (owner, app): UseQueryResult<DatamodelMetadata[]> => {
  const { getDatamodelsXsd } = useServicesContext();
  return useQuery<DatamodelMetadata[]>(
    [QueryKey.DatamodelsXsd, owner, app],
    () => getDatamodelsXsd(owner, app),
  );
};

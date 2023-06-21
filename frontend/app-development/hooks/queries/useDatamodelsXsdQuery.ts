import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { DatamodelsXsd } from 'app-shared/types/DatamodelsXsd';

export const useDatamodelsXsdQuery = (owner, app): UseQueryResult<DatamodelsXsd[]> => {
  const { getDatamodelsXsd } = useServicesContext();
  return useQuery<DatamodelsXsd[]>(
    [QueryKey.DatamodelsXsd, owner, app],
    () => getDatamodelsXsd(owner, app),
  );
};

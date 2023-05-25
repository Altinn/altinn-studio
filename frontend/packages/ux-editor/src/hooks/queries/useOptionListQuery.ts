import { QueryKey } from '../../types/QueryKey';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';


export const useOptionListQuery = (org: string, app: string): UseQueryResult => {
  const { getOptionListIds } = useServicesContext();
  return useQuery(
    [QueryKey.OptionListIds, org, app],
    () => getOptionListIds(org, app).then(result => result || { org: {}, app: {}, id: {} }),
  );
};

import { useQuery } from '@tanstack/react-query';
import { QueryKey } from '../../types/QueryKey';
import { useServicesContext } from '../../contexts/ServicesContext';
import type { DataType } from '../../types/DataType';

export const useDataTypeQuery = (org: string, app: string, dataModelName: string) => {
  const { getDataType } = useServicesContext();

  return useQuery<DataType>({
    queryKey: [QueryKey.DataType, org, app, dataModelName],
    queryFn: () =>
      getDataType(org, app, dataModelName).then((dataType) => {
        return dataType;
      }),
  });
};

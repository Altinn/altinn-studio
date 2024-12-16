import { useQuery } from '@tanstack/react-query';
import { QueryKey } from '../../types/QueryKey';
import { useServicesContext } from '../../contexts/ServicesContext';

export const useDataTypeQuery = (org: string, app: string, dataModelName: string) => {
  const { getDataType } = useServicesContext();

  return useQuery<any>({
    queryKey: [QueryKey.DataType, dataModelName],
    queryFn: () =>
      getDataType(org, app, dataModelName).then((dataType) => {
        return dataType;
      }),
  });
};

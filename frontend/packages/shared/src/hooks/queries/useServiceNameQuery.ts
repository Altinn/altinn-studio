import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { AxiosError } from 'axios';

export const useServiceNameQuery = (
  org: string,
  app: string,
): UseQueryResult<string, AxiosError> => {
  const { getServiceName } = useServicesContext();

  return useQuery<string, AxiosError>([QueryKey.ServiceName, org, app], () =>
    getServiceName(org, app),
  );
};

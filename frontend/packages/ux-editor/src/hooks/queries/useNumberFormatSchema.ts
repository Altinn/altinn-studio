import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useQuery, UseQueryResult } from '@tanstack/react-query';

export const useNumberFormatSchema = (): UseQueryResult<any> => {
  const { getNumberFormatSchema } = useServicesContext();

  return useQuery<string[]>(
    ['numberFormatSchema'],
    () => getNumberFormatSchema().then((result) => result),
    {
      cacheTime: Infinity,
      staleTime: Infinity,
    }
  );
};

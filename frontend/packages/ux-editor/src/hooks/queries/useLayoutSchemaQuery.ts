import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useQuery, UseQueryResult } from '@tanstack/react-query';

export const useLayoutSchemaQuery = (): UseQueryResult<any> => {
  const { getLayoutSchema } = useServicesContext();

  return useQuery<string[]>(
    ['layoutSchema'],
    () => getLayoutSchema().then((result) => result),
    {
      cacheTime: Infinity,
      staleTime: Infinity,
    }
  );
};

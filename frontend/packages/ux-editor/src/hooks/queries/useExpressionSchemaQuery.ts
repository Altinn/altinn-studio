import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useQuery, UseQueryResult } from '@tanstack/react-query';

export const useExpressionSchemaQuery = (): UseQueryResult<any> => {
  const { getExpressionSchema } = useServicesContext();

  return useQuery<string[]>(
    ['expressionSchema'],
    () => getExpressionSchema().then((result) => result),
    {
      cacheTime: Infinity,
      staleTime: Infinity,
    }
  );
};

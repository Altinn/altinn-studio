import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useQueries, UseQueryResult } from '@tanstack/react-query';
import { addSchema } from '../../utils/formLayoutUtils';

export const useLayoutSchemaQuery = (): UseQueryResult<any>[] => {
  const { getExpressionSchema, getNumberFormatSchema, getLayoutSchema } = useServicesContext();

  const [expressionSchemaQuery, numberFormatSchemaQuery, layoutSchemaQuery] = useQueries({
    queries: [
      { name: 'expressionSchema', fn: getExpressionSchema },
      { name: 'numberFormatSchema', fn: getNumberFormatSchema },
      { name: 'layoutSchema', fn: getLayoutSchema }
    ].map(item => {
      return {
        queryKey: [item.name],
        queryFn: () => item.fn().then((result) => {
          addSchema(result);
          return result;
        }),
        cacheTime: Infinity,
        staleTime: Infinity,
      }
    })
  });

  return [layoutSchemaQuery, expressionSchemaQuery, numberFormatSchemaQuery];
};

import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useQueries, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { addSchemas } from '../../utils/formValidationUtils';

export const useLayoutSchemaQuery = (): UseQueryResult<any>[] => {
  const { getExpressionSchema, getNumberFormatSchema, getLayoutSchema } = useServicesContext();
  const queryClient = useQueryClient();

  const [expressionSchemaQuery, numberFormatSchemaQuery, layoutSchemaQuery] = useQueries({
    queries: [
      { name: 'expressionSchema', fn: getExpressionSchema },
      { name: 'numberFormatSchema', fn: getNumberFormatSchema },
      { name: 'layoutSchema', fn: getLayoutSchema }
    ].map(item => {
      return {
        queryKey: [item.name],
        queryFn: () => item.fn().then((result) => {
          addSchemas([result]);
          return result;
        }),
        cacheTime: Infinity,
        staleTime: Infinity,
        enabled: item.name === 'layoutSchema' ? !!queryClient.getQueryData(['expressionSchema']) && !!queryClient.getQueryData(['numberFormatSchema']) : true
      }
    })
  });

  return [layoutSchemaQuery, expressionSchemaQuery, numberFormatSchemaQuery];
};

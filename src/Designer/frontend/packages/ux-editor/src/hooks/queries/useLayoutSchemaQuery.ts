// import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { addSchemas } from 'app-shared/utils/formValidationUtils';

import expressionSchema from '@app/layout-contract/schemas/json/layout/expression.schema.v1.json';
import numberFormatSchema from '@app/layout-contract/schemas/json/component/number-format.schema.v1.json';
import layoutSchema from '@app/layout-contract/schemas/json/layout/layout.schema.v1.json';

type LayoutSchemaQueries = {
  layoutSchemaQuery: UseQueryResult<typeof layoutSchema>;
  expressionSchemaQuery: UseQueryResult<typeof expressionSchema>;
  numberFormatSchemaQuery: UseQueryResult<typeof numberFormatSchema>;
};

export const useLayoutSchemaQuery = (): LayoutSchemaQueries => {
  const queryClient = useQueryClient();

  const [expressionSchemaQuery, numberFormatSchemaQuery, layoutSchemaQuery] = useQueries({
    queries: [
      { name: 'expressionSchema', fn: () => Promise.resolve(expressionSchema) },
      { name: 'numberFormatSchema', fn: () => Promise.resolve(numberFormatSchema) },
      { name: 'layoutSchema', fn: () => Promise.resolve(layoutSchema) },
    ].map((item) => {
      return {
        queryKey: [item.name],
        queryFn: () =>
          item.fn().then((result) => {
            addSchemas([result]);
            return result;
          }),
        cacheTime: Infinity,
        staleTime: Infinity,
        enabled:
          item.name === 'layoutSchema'
            ? !!queryClient.getQueryData(['expressionSchema']) &&
              !!queryClient.getQueryData(['numberFormatSchema'])
            : true,
      };
    }),
  });

  return { layoutSchemaQuery, expressionSchemaQuery, numberFormatSchemaQuery };
};

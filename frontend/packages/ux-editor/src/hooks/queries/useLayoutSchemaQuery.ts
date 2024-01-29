// import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { addSchemas } from '../../utils/formValidationUtils';

import expressionSchema from '../../testing/schemas/json/layout/expression.schema.v1.json';
import numberFormatSchema from '../../testing/schemas/json/layout/number-format.schema.v1.json';
import layoutSchema from '../../testing/schemas/json/layout/layout.schema.v1.json';
import commonDefsSchema from '../../testing/schemas/json/component/common-defs.schema.v1.json';

export const useLayoutSchemaQuery = (): UseQueryResult<any>[] => {
  // const { getExpressionSchema, getNumberFormatSchema, getLayoutSchema, getComponentsCommonDefsSchema } = useServicesContext();
  const queryClient = useQueryClient();

  // Currently use local mocks rather than fetching from CDN. This is because the CDN schemas are not ready to use, and
  // we also have made some modifications locally to the schemas.
  // When the schemas are available on CDN, we can remove the mocks and use the querys instead.
  const [expressionSchemaQuery, numberFormatSchemaQuery, commonDefsSchemaQuery, layoutSchemaQuery] =
    useQueries({
      queries: [
        { name: 'expressionSchema', fn: () => Promise.resolve(expressionSchema) },
        { name: 'numberFormatSchema', fn: () => Promise.resolve(numberFormatSchema) },
        { name: 'common-defs', fn: () => Promise.resolve(commonDefsSchema) },
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
            item.name === 'layoutSchema' || item.name === 'common-defs'
              ? !!queryClient.getQueryData(['expressionSchema']) &&
                !!queryClient.getQueryData(['numberFormatSchema'])
              : true,
        };
      }),
    });

  return [layoutSchemaQuery, commonDefsSchemaQuery, expressionSchemaQuery, numberFormatSchemaQuery];
};

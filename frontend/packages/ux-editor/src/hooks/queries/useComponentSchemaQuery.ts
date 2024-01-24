// import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addSchemas, dereferenceSchema } from '../../utils/formValidationUtils';
import { componentSchemaMocks } from '../../testing/componentSchemaMocks';
import { QueryKey } from 'app-shared/types/QueryKey';

export interface UseComponentSchemaQueryResult {
  queryResults: {
    [key: string]: UseQueryResult<any>;
  };
}

// Currently use local mocks rather than fetching from CDN. This is because the CDN schemas are not ready to use, and
// we also have made some modifications locally to the schemas.
// When the schemas are available on CDN, we can remove the mocks and use the querys instead.
export const useComponentSchemaQuery = (component: string): UseQueryResult<any> => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [QueryKey.FormComponent, component],
    queryFn: () => {
      addSchemas([componentSchemaMocks[component]]);
      return Promise.resolve(dereferenceSchema(componentSchemaMocks[component]));
    },
    gcTime: Infinity,
    staleTime: Infinity,
    enabled:
      !!queryClient.getQueryData(['expressionSchema']) &&
      !!queryClient.getQueryData(['numberFormatSchema']) &&
      !!queryClient.getQueryData(['common-defs']),
  });
};

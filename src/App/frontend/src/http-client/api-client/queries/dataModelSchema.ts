import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================
// Types
// ============================================================

export type DataModelSchemaParams = {
  dataTypeName: string;
};

export type DataModelSchemaResponse = Record<string, unknown>; // JSON Schema

// ============================================================
// Query Key
// ============================================================

export const dataModelSchemaKeys = {
  all: ['dataModelSchema'] as const,
  byDataType: (params: DataModelSchemaParams) => [...dataModelSchemaKeys.all, params] as const,
};

// ============================================================
// Pure HTTP Layer
// ============================================================

export async function fetchDataModelSchema(params: DataModelSchemaParams): Promise<DataModelSchemaResponse> {
  const { dataTypeName } = params;
  const url = `/api/jsonschema/${dataTypeName}`;
  const response = await axios.get<DataModelSchemaResponse>(url);
  return response.data;
}

// ============================================================
// Query Options
// ============================================================

export function dataModelSchemaQueryOptions(params: DataModelSchemaParams | undefined) {
  return queryOptions({
    queryKey: dataModelSchemaKeys.byDataType(params!),
    queryFn: params ? () => fetchDataModelSchema(params) : skipToken,
  });
}

// ============================================================
// Hooks
// ============================================================

/** Full React Query hook */
export function useDataModelSchemaQuery(params: DataModelSchemaParams | undefined) {
  return useQuery(dataModelSchemaQueryOptions(params));
}

/** Simple data hook */
export function useDataModelSchema(params: DataModelSchemaParams | undefined) {
  const { data } = useDataModelSchemaQuery(params);
  return data;
}

/** Invalidation hook */
export function useInvalidateDataModelSchema() {
  const queryClient = useQueryClient();

  return (params?: DataModelSchemaParams) => {
    if (params) {
      return queryClient.invalidateQueries({
        queryKey: dataModelSchemaKeys.byDataType(params),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: dataModelSchemaKeys.all,
    });
  };
}

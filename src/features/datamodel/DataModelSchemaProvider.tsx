import { useQuery } from '@tanstack/react-query';
import type { JSONSchema7 } from 'json-schema';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { dotNotationToPointer } from 'src/features/datamodel/notations';
import { lookupBindingInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import { useCurrentDataModelName, useCurrentDataModelType } from 'src/features/datamodel/useBindingSchema';
import { getRootElementPath } from 'src/utils/schemaUtils';
import type { SchemaLookupResult } from 'src/features/datamodel/SimpleSchemaTraversal';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const useDataModelSchemaQuery = () => {
  const { fetchDataModelSchema } = useAppQueries();
  const dataModelName = useCurrentDataModelName();
  const dataType = useCurrentDataModelType();
  const enabled = !!dataModelName;

  const utils = useQuery({
    enabled,
    queryKey: ['fetchDataModelSchemas', dataModelName],
    queryFn: () => fetchDataModelSchema(dataModelName!),
    onError: (error: HttpClientError) => {
      if (error.status === 404) {
        window.logWarn('Data model schema not found:\n', error);
      } else {
        window.logError('Data model schema request failed:\n', error);
      }
    },
    select: (schema) => {
      const rootElementPath = getRootElementPath(schema, dataType);
      const lookupTool = new SchemaLookupTool(schema, rootElementPath);
      return { schema, lookupTool };
    },
  });

  return { ...utils, enabled };
};

export interface DataModelSchemaContext {
  schema: JSONSchema7 | undefined;
  lookupTool: SchemaLookupTool;
}

/**
 * Simple caching lookup tool for finding the schema for a given binding/path
 */
export class SchemaLookupTool {
  private cache: Record<string, SchemaLookupResult> = {};

  constructor(
    private schema: JSONSchema7,
    private rootElementPath: string,
  ) {}

  public getSchemaForPath(path: string): SchemaLookupResult {
    if (path in this.cache) {
      return this.cache[path];
    }

    const targetPointer = dotNotationToPointer(path);
    const result = lookupBindingInSchema({
      schema: this.schema,
      rootElementPath: this.rootElementPath,
      targetPointer,
    });

    this.cache[path] = result;
    return result;
  }
}

const { Provider, useCtx, useLaxCtx } = delayedContext(() =>
  createQueryContext<DataModelSchemaContext, true>({
    name: 'DataModelSchema',
    required: true,
    query: useDataModelSchemaQuery,
  }),
);

export const DataModelSchemaProvider = Provider;
export const useCurrentDataModelSchema = () => useCtx().schema;
export const useCurrentDataModelSchemaLookup = () => useCtx().lookupTool;
export const useLaxCurrentDataModelSchemaLookup = () => {
  const ctx = useLaxCtx();
  if (ctx === ContextNotProvided) {
    return undefined;
  }
  return ctx.lookupTool;
};

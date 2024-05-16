import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';
import type { JSONSchema7 } from 'json-schema';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { dotNotationToPointer } from 'src/features/datamodel/notations';
import { lookupBindingInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import { useCurrentDataModelName, useCurrentDataModelType } from 'src/features/datamodel/useBindingSchema';
import { getRootElementPath } from 'src/utils/schemaUtils';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { SchemaLookupResult } from 'src/features/datamodel/SimpleSchemaTraversal';

// Also used for prefetching @see formPrefetcher.ts
export function useDataModelSchemaQueryDef(dataTypeId?: string): QueryDefinition<JSONSchema7> {
  const { fetchDataModelSchema } = useAppQueries();
  return {
    queryKey: ['fetchDataModelSchemas', dataTypeId],
    queryFn: dataTypeId ? () => fetchDataModelSchema(dataTypeId) : skipToken,
    enabled: !!dataTypeId,
  };
}

const useDataModelSchemaQuery = () => {
  const dataModelName = useCurrentDataModelName();
  const dataType = useCurrentDataModelType();

  const queryDef = useDataModelSchemaQueryDef(dataModelName);
  const utils = useQuery({
    ...queryDef,
    select: (schema) => {
      const rootElementPath = getRootElementPath(schema, dataType);
      const lookupTool = new SchemaLookupTool(schema, rootElementPath);
      return { schema, lookupTool };
    },
  });

  useEffect(() => {
    utils.error && window.logError('Fetching data model schema failed:\n', utils.error);
  }, [utils.error]);

  return { ...utils, enabled: queryDef.enabled };
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

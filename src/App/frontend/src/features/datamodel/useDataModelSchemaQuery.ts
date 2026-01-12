import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';
import type Ajv from 'ajv';
import type { JSONSchema7 } from 'json-schema';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { dotNotationToPointer } from 'src/features/datamodel/notations';
import { lookupBindingInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import { useDataModelType } from 'src/features/datamodel/useBindingSchema';
import { createValidator } from 'src/features/validation/schemaValidation/schemaValidationUtils';
import { getRootElementPath } from 'src/utils/schemaUtils';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';
import type { SchemaLookupResult } from 'src/features/datamodel/SimpleSchemaTraversal';
import type { IDataType } from 'src/types/shared';

export type DataModelSchemaResult = {
  schema: JSONSchema7;
  validator: Ajv;
  rootElementPath: string;
  lookupTool: SchemaLookupTool;
};

// Also used for prefetching @see formPrefetcher.ts
export function useDataModelSchemaQueryDef(
  enabled: boolean,
  dataType?: IDataType,
): QueryDefinition<DataModelSchemaResult> {
  const { fetchDataModelSchema } = useAppQueries();
  return {
    queryKey: ['fetchDataModelSchemas', dataType?.id],
    queryFn: dataType
      ? async () => {
          const schema = await fetchDataModelSchema(dataType.id);
          const rootElementPath = getRootElementPath(schema, dataType);
          const lookupTool = new SchemaLookupTool(schema, rootElementPath);
          const validator = createValidator(schema);
          return { schema, validator, rootElementPath, lookupTool };
        }
      : skipToken,
    enabled: enabled && !!dataType,
  };
}

export const useDataModelSchemaQuery = (enabled: boolean, dataTypeId: string) => {
  const dataType = useDataModelType(dataTypeId);

  const queryDef = useDataModelSchemaQueryDef(enabled, dataType);
  const utils = useQuery(queryDef);

  useEffect(() => {
    utils.error && window.logError('Fetching data model schema failed:\n', utils.error);
  }, [utils.error]);

  return { ...utils, enabled: queryDef.enabled };
};

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

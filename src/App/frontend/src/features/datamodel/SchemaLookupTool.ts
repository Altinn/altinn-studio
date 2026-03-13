import type Ajv from 'ajv';
import type { JSONSchema7 } from 'json-schema';

import { dotNotationToPointer } from 'src/features/datamodel/notations';
import { lookupBindingInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import type { SchemaLookupResult } from 'src/features/datamodel/SimpleSchemaTraversal';

export type DataModelSchemaResult = {
  schema: JSONSchema7;
  validator: Ajv;
  rootElementPath: string;
  lookupTool: SchemaLookupTool;
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

import type { JSONSchema7 } from 'json-schema';

import { CG } from 'src/codegen/CG';
import { GenerateCommonImport } from 'src/codegen/dataTypes/GenerateCommonImport';

/**
 * Generates a data model binding property. This is just a regular property, but this class is used as a
 * helper to make sure you always provide a description and title.
 */
export class GenerateDataModelBinding extends GenerateCommonImport<'IDataModelReference'> {
  private rawBinding = CG.common('IRawDataModelBinding');

  constructor() {
    super('IDataModelReference');
  }

  toJsonSchema(): JSONSchema7 {
    // This tricks the schema to output a union of either string or object, although the typescript types are only
    // objects. We rewrite incoming layouts to always be objects in LayoutsContext, so in practice this is always
    // an object internally.
    return this.rawBinding.toJsonSchema();
  }
}

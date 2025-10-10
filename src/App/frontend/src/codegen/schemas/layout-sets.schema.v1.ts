import type { JSONSchema7 } from 'json-schema';

import { generateCommonSchema } from 'src/codegen/Common';
import { SchemaFile } from 'src/codegen/SchemaFile';

export class LayoutSetsSchemaV1 extends SchemaFile {
  getFileName(): string {
    return 'layout/layout-sets.schema.v1.json';
  }

  async getSchema(): Promise<JSONSchema7> {
    generateCommonSchema();
    return {
      title: 'Altinn layout sets',
      description: 'Schema that describes the different layout sets for an Altinn application and when to use them',
      $ref: '#/definitions/ILayoutSets',
    };
  }
}

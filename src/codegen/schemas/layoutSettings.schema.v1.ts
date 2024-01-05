import type { JSONSchema7 } from 'json-schema';

import { generateCommonSchema } from 'src/codegen/Common';
import { SchemaFile } from 'src/codegen/SchemaFile';

export class LayoutSettingsSchemaV1 extends SchemaFile {
  getFileName(): string {
    return 'layout/layoutSettings.schema.v1.json';
  }

  async getSchema(): Promise<JSONSchema7> {
    generateCommonSchema();
    return {
      title: 'Altinn layout settings',
      description: 'Schema that describes settings for the layout configuration for Altinn applications.',
      $ref: '#/definitions/ILayoutSettings',
    };
  }
}

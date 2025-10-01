import type { JSONSchema7 } from 'json-schema';

import { generateCommonSchema } from 'src/codegen/Common';
import { SchemaFile } from 'src/codegen/SchemaFile';

export class LayoutSchemaV1 extends SchemaFile {
  getFileName(): string {
    return 'layout/layout.schema.v1.json';
  }

  async getSchema(): Promise<JSONSchema7> {
    generateCommonSchema();
    const out: JSONSchema7 = {
      $ref: '#/definitions/ILayoutFile',
      definitions: {
        AnyComponent: {
          type: 'object',
          properties: {
            type: {
              // This is a trick to make the type property required, but still override the type with a const value
              // in each of the component schemas (not normally possible with this code generator)
              title: 'Type',
              description: 'The component type',
              enum: this.sortedKeys.map((key) => this.componentList[key]),
            },
          },
          allOf: this.sortedKeys.map((key) => ({
            if: { properties: { type: { const: this.componentList[key] } } },
            then: { $ref: `#/definitions/Comp${key}` },
          })),
        },
      },
    };

    for (const key of this.sortedKeys) {
      const config = this.configMap[key];
      out.definitions = out.definitions || {};
      out.definitions[`Comp${key}`] = config.toJsonSchema();
    }

    return out;
  }
}

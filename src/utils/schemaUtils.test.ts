import type { JSONSchema7 } from 'json-schema';

import * as complexSchema from 'src/__mocks__/json-schema/complex.json';
import * as oneOfOnRootSchema from 'src/__mocks__/json-schema/one-of-on-root.json';
import * as refOnRootSchema from 'src/__mocks__/json-schema/ref-on-root.json';
import { lookupPropertiesInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import { ensureAppsDirIsSet, getAllApps } from 'src/test/allApps';
import { getRootElementPath, getSchemaPart, getSchemaPartOldGenerator } from 'src/utils/schemaUtils';
import type { IDataModelBindings } from 'src/layout/layout';

describe('schemaUtils', () => {
  describe('getRootElementPath', () => {
    describe('when receiving a 2020-12 draft schema', () => {
      const schema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        id: 'schema.json',
        type: 'object',
        oneOf: [
          {
            $ref: '#/$defs/Test',
          },
        ],
        $defs: {
          Test: {
            type: 'string',
          },
        },
      };
      it('should return empty string as root element path when no properties node is present', () => {
        const result = getRootElementPath(schema, undefined);
        expect(result).toEqual('');
      });

      it('should return path under properties.melding.$ref when info.meldingsnavn node is present', () => {
        const useSchema = {
          ...schema,
          oneOf: undefined,
          info: {
            meldingsnavn: 'melding',
          },
          properties: {
            melding: {
              $ref: '#/$defs/Test',
            },
          },
        };
        const result = getRootElementPath(useSchema, undefined);
        expect(result).toEqual('#/$defs/Test');
      });

      it('should not return path under first property when properties node is present with no info node', () => {
        const useSchema = {
          ...schema,
          properties: {
            melding: {
              $ref: '#/$defs/Test',
            },
          },
        };
        const result = getRootElementPath(useSchema, undefined);
        expect(result).toEqual('');
      });
    });

    describe('when receiving an older schema', () => {
      const schema = {
        $schema: 'http://json-schema.org/draft/#schema',
        id: 'schema.json',
        type: 'object',
        properties: {
          melding: {
            $ref: '#/definitions/Test',
          },
        },
        definitions: {
          Test: {
            type: 'string',
          },
        },
      };

      it('should return path under properties.melding.$ref when info.meldingsnavn node is present', () => {
        const useSchema = {
          ...schema,
          info: {
            meldingsnavn: 'melding',
          },
        };
        const result = getRootElementPath(useSchema, undefined);
        expect(result).toEqual('#/definitions/Test');
      });

      it('should not return path under first property when properties node is present with no info node', () => {
        const result = getRootElementPath(schema, undefined);
        expect(result).toEqual('');
      });
    });

    describe('when rootNode property is set', () => {
      const schema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        id: 'schema.json',
        type: 'object',
        info: {
          rootNode: '#/$defs/Test',
        },
        oneOf: [
          {
            $ref: '#/$defs/Test',
          },
        ],
        $defs: {
          Test: {
            type: 'string',
          },
        },
      };
      it('should return the value set in root node', () => {
        const result = getRootElementPath(schema, undefined);
        expect(result).toEqual('#/$defs/Test');
      });
    });
  });

  describe('getRootElementPath (in real apps)', () => {
    const dir = ensureAppsDirIsSet();
    if (!dir) {
      return;
    }

    const allApps = getAllApps(dir)
      .filter((app) => app.isValid())
      .map((app) => app.enableCompatibilityMode().getDataModelsFromLayoutSets())
      .flat()
      .filter((model) => model.isValid())
      .map((model) => ({ appName: model.app.getName(), dataType: model.getName(), model }));

    it.each(allApps)('$appName/$dataType', ({ model }) => {
      const schema = model.getSchema();
      const rootPath = getRootElementPath(schema, model.getDataDef());
      const availableProperties = lookupPropertiesInSchema(schema, rootPath);
      const availablePropertiesOnRoot = lookupPropertiesInSchema(schema, '');

      let availablePropertiesOnFirstProperty = new Set<string>();
      if (schema.properties && typeof schema.properties === 'object') {
        const firstProperty = Object.keys(schema.properties)[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((firstProperty as any).$ref) {
          availablePropertiesOnFirstProperty = lookupPropertiesInSchema(schema, firstProperty);
        }
      }

      const notFound: string[] = [];
      for (const [pageKey, layout] of Object.entries(model.layoutSet!.getLayouts())) {
        for (const component of layout.data.layout || []) {
          if (!('dataModelBindings' in component && component.dataModelBindings)) {
            continue;
          }
          const bindings = component.dataModelBindings as IDataModelBindings;
          for (const binding of Object.values(bindings)) {
            const firstLeg = binding.split('.')[0];
            const foundInPath = availableProperties.has(firstLeg);
            const foundInRoot = availablePropertiesOnRoot.has(firstLeg);
            const foundInFirstProperty = availablePropertiesOnFirstProperty.has(firstLeg);
            const location = `Used in ${model.layoutSet!.getName()}/${pageKey}/${component.id} (${component.type}) (binding = ${binding})`;
            if (!foundInPath && foundInRoot) {
              notFound.push(
                [`${firstLeg} was found in the root of the schema, but not in ${rootPath}.`, location].join(' '),
              );
            } else if (!foundInPath && foundInFirstProperty) {
              notFound.push(
                [`${firstLeg} was found in the first property of the schema, but not in ${rootPath}.`, ''].join(' '),
              );
            }
          }
        }
      }

      expect(notFound).toEqual([]);
    });
  });

  describe('getSchemaPart', () => {
    it('should return items based in a oneOf ref on root', () => {
      const nestedPathResult = getSchemaPart(
        '#/$defs/skjema/properties/alder/maximum',
        oneOfOnRootSchema as JSONSchema7,
      );
      expect(nestedPathResult).toEqual({
        type: 'number',
        minimum: 0,
        maximum: 10,
      });
    });

    it('should return item based on ref on root', () => {
      const result = getSchemaPart(
        '#/definitions/Skjema/properties/person/properties/age/minimum',
        refOnRootSchema as JSONSchema7,
      );
      expect(result).toEqual({
        type: 'integer',
        minimum: 0,
        maximum: 100,
      });
    });

    it('should handle complex schema', () => {
      const result = getSchemaPart('#/$defs/Navn/maxLength', complexSchema as unknown as JSONSchema7);
      expect(result).toEqual({
        type: 'string',
        '@xsdType': 'string',
        '@xsdUnhandledAttributes': {
          'seres:elementtype': 'Dataenkeltype',
          'seres:guid': 'https://seres.no/guid/Kursdomene/Dataenkeltype/Navn/4007',
        },
      });
    });
  });

  describe('getSchemaPartOldGenerator', () => {
    it('should return definition from parent schema', () => {
      const result = getSchemaPartOldGenerator('#/definitions/Name/minimum', refOnRootSchema, '#/definitions/Skjema');
      expect(result).toEqual({
        type: 'string',
        minimum: 5,
        maximum: 10,
      });
    });

    it('should return property from sub schema', () => {
      const result = getSchemaPartOldGenerator(
        '#/properties/person/properties/age/maximum',
        refOnRootSchema,
        '#/definitions/Skjema',
      );
      expect(result).toEqual({
        type: 'integer',
        minimum: 0,
        maximum: 100,
      });
    });
  });
});

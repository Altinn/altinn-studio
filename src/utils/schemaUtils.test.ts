import * as complexSchema from 'src/__mocks__/json-schema/complex.json';
import * as oneOfOnRootSchema from 'src/__mocks__/json-schema/one-of-on-root.json';
import * as refOnRootSchema from 'src/__mocks__/json-schema/ref-on-root.json';
import { getRootElementPath, getSchemaPart, getSchemaPartOldGenerator } from 'src/utils/schemaUtils';

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
        const result = getRootElementPath(schema);
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
        const result = getRootElementPath(useSchema);
        expect(result).toEqual('#/$defs/Test');
      });

      it('should return path under first property when properties node is present with no info node', () => {
        const useSchema = {
          ...schema,
          properties: {
            melding: {
              $ref: '#/$defs/Test',
            },
          },
        };
        const result = getRootElementPath(useSchema);
        expect(result).toEqual('#/$defs/Test');
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
        const result = getRootElementPath(useSchema);
        expect(result).toEqual('#/definitions/Test');
      });

      it('should return path under first property when properties node is present with no info node', () => {
        const result = getRootElementPath(schema);
        expect(result).toEqual('#/definitions/Test');
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
        const result = getRootElementPath(schema);
        expect(result).toEqual('#/$defs/Test');
      });
    });
  });

  describe('getSchemaPart', () => {
    it('should return items based in a oneOf ref on root', () => {
      const nestedPathResult = getSchemaPart('#/$defs/skjema/properties/alder/maximum', oneOfOnRootSchema);
      expect(nestedPathResult).toEqual({
        type: 'number',
        minimum: 0,
        maximum: 10,
      });
    });

    it('should return item based on ref on root', () => {
      const result = getSchemaPart('#/definitions/Skjema/properties/person/properties/age/minimum', refOnRootSchema);
      expect(result).toEqual({
        type: 'integer',
        minimum: 0,
        maximum: 100,
      });
    });

    it('should handle complex schema', () => {
      const result = getSchemaPart('#/$defs/Navn/maxLength', complexSchema);
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

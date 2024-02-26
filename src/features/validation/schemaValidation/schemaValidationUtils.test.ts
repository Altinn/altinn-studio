import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import type { JSONSchema7 } from 'json-schema';

import { createValidator } from 'src/features/validation/schemaValidation/schemaValidationUtils';

describe('schemaValidationUtils', () => {
  describe('createValidator', () => {
    const schema: JSONSchema7 = {
      $id: 'schema.json',
      type: 'object',
      properties: {
        test: {
          $ref: '#/$defs/Test',
        },
      },
      $defs: {
        Test: {
          type: 'string',
        },
      },
    };

    it('when receiving a 2020-12 draft schema it should create ajv2020 validator instance', () => {
      const validator = createValidator({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        ...schema,
      });
      expect(validator).toBeInstanceOf(Ajv2020);
    });

    it('when receiving anything but 2020-12 draft schema it should create ajv validator instance', () => {
      const validator = createValidator({
        $schema: 'http://json-schema.org/schema#',
        ...schema,
      });
      expect(validator).toBeInstanceOf(Ajv);
    });
  });
});

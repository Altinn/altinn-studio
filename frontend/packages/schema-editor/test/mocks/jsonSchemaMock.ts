import type { JsonSchema } from 'app-shared/types/JsonSchema';

// Example from https://json-schema.org/learn/miscellaneous-examples.html
export const jsonSchemaMock: JsonSchema = {
  $id: 'https://example.com/complex-object.schema.json',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Complex Object',
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    age: {
      type: 'integer',
      minimum: 0,
    },
    address: {
      type: 'object',
      properties: {
        street: {
          type: 'string',
        },
        city: {
          type: 'string',
        },
        state: {
          type: 'string',
        },
        postalCode: {
          type: 'string',
          pattern: '\\d{5}',
        },
      },
      required: ['street', 'city', 'state', 'postalCode'],
    },
    hobbies: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['name', 'age'],
};

import { jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import type { JSONSchema7 } from 'json-schema';

import * as DataModelSchemaProvider from 'src/features/datamodel/DataModelSchemaProvider';
import * as UseBindingSchema from 'src/features/datamodel/useBindingSchema';
import { FD } from 'src/features/formData/FormDataWrite';
import { useSchemaValidation } from 'src/features/validation/schemaValidation/useSchemaValidation';
import type { IDataType } from 'src/types/shared';

describe('useSchemaValidation', () => {
  describe('format validation', () => {
    beforeEach(() => {
      jest.spyOn(FD, 'useDebounced').mockRestore();
      jest.spyOn(DataModelSchemaProvider, 'useCurrentDataModelSchema').mockRestore();
      jest.spyOn(UseBindingSchema, 'useCurrentDataModelType').mockRestore();
    });

    const formatTests = [
      {
        format: 'date',
        tests: [
          { value: '2020-01-01', expected: true },
          { value: '1985-04-12T23:20:50.52Z', expected: false },
          { value: 'asdfasdf', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'date-time',
        tests: [
          { value: '2020-01-01', expected: false },
          { value: '1985-04-12T23:20:50.52Z', expected: true },
          { value: 'asdfasdf', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'time',
        tests: [
          { value: '23:20:50.52Z', expected: true },
          { value: '2020-01-01', expected: false },
          { value: '1985-04-12T23:20:50.52Z', expected: false },
          { value: 'asdfasdf', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'duration',
        tests: [
          { value: 'P3Y6M4DT12H30M5S', expected: true },
          { value: 'P23DT23H', expected: true },
          { value: 'P3Y6M4DT12H30M5', expected: false },
          { value: 'asdfasdf', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'email',
        tests: [
          { value: 'test@gmail.com', expected: true },
          { value: 'æøå@gmail.com', expected: false },
          { value: 'asdfasdf', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'idn-email',
        tests: [
          { value: 'test@gmail.com', expected: true },
          { value: 'æøå@gmail.com', expected: true },
          { value: 'asdfasdf', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'hostname',
        tests: [
          { value: 'altinn.no', expected: true },
          { value: 'altinnæøå.no.', expected: false },
          { value: 'altinn/studio', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'idn-hostname',
        tests: [
          { value: 'altinn.no', expected: true },
          { value: 'altinnæøå.no.', expected: true },
          { value: 'altinn/studio', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'ipv4',
        tests: [
          { value: '192.168.10.101', expected: true },
          { value: '192.168.10.999', expected: false },
          { value: 'asdfasdf', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'ipv6',
        tests: [
          { value: '2001:0db8:85a3:0000:0000:8a2e:0370:7334', expected: true },
          { value: '2001:0db8:85a3::8a2e:0370:7334', expected: true },
          { value: '2001:0db8:85a3::8a2e:0370:733m', expected: false },
          { value: 'asdfasdf', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'uuid',
        tests: [
          { value: '123e4567-e89b-12d3-a456-426614174000', expected: true },
          { value: '123e4567-e89b-12d3-a456-42661417400g', expected: false },
          { value: 'asdfasdf', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'uri',
        tests: [
          { value: 'http://altinn.no', expected: true },
          { value: 'http://altinn.no/æøå', expected: false },
          { value: '#/hei', expected: false },
          { value: 'asdfasdf', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'uri-reference',
        tests: [
          { value: 'http://altinn.no', expected: true },
          { value: '#/hei', expected: true },
          { value: '%%', expected: false },
          { value: '#/æøå', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'iri',
        tests: [
          { value: 'http://altinn.no/æøå', expected: true },
          { value: 'asdfasdf', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'iri-reference',
        tests: [
          { value: 'http://altinn.no/æøå', expected: true },
          { value: '#/æøå', expected: true },
          { value: 'javascript:;', expected: false }, // It was hard to find an invalid case, not sure why this is invalid
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'uri-template',
        tests: [
          { value: 'http://{org}.apps.altinn.no/{org}/{app}', expected: true },
          { value: 'http://altinn.no/', expected: true },
          { value: 'htt%p://altinn.no', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'json-pointer',
        tests: [
          { value: '/foo/bar', expected: true },
          { value: '0', expected: false },
          { value: '1/a~1b', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'relative-json-pointer',
        tests: [
          { value: '/foo/bar', expected: false },
          { value: '0', expected: true },
          { value: '1/a~1b', expected: true },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
      {
        format: 'regex',
        tests: [
          { value: '^\\d{4}-\\d{2}-\\d{2}$', expected: true },
          { value: '^\\d{4}-\\d{2}-(\\d{2}$', expected: false },
          { value: '', expected: true },
          { value: null, expected: true },
          { value: undefined, expected: true },
        ],
      },
    ];

    formatTests.forEach(({ format, tests }) => {
      describe(format, () => {
        tests.forEach(({ value, expected }) => {
          it(`${value} should ${expected ? 'be valid' : 'not be valid'}`, async () => {
            const formData = {
              field: value,
            };

            const schema: JSONSchema7 = {
              $schema: 'https://json-schema.org/draft/2020-12/schema',
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  format,
                },
              },
            };

            jest.spyOn(FD, 'useDebounced').mockReturnValue(formData);
            jest.spyOn(DataModelSchemaProvider, 'useCurrentDataModelSchema').mockReturnValue(schema);
            jest.spyOn(UseBindingSchema, 'useCurrentDataModelType').mockReturnValue({} as IDataType);

            const { result } = renderHook(() => useSchemaValidation());

            expect(Object.keys(result.current)).toHaveLength(expected ? 0 : 1);
          });
        });
      });
    });
  });
});

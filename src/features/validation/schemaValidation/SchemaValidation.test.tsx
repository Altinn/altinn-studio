import React from 'react';

import { render } from '@testing-library/react';
import type { JSONSchema7 } from 'json-schema';

import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import * as UseBindingSchema from 'src/features/datamodel/useBindingSchema';
import { FD } from 'src/features/formData/FormDataWrite';
import { SchemaValidation } from 'src/features/validation/schemaValidation/SchemaValidation';
import { Validation } from 'src/features/validation/validationContext';
import type { IDataType } from 'src/types/shared';

describe('SchemaValidation', () => {
  describe('format validation', () => {
    beforeEach(() => {
      jest.spyOn(FD, 'useDebounced').mockRestore();
      jest.spyOn(DataModels, 'useDataModelSchema').mockRestore();
      jest.spyOn(UseBindingSchema, 'useDataModelType').mockRestore();
      jest.spyOn(Validation, 'useUpdateDataModelValidations').mockRestore();
    });

    const formatTests = [
      {
        format: 'date',
        tests: [
          { value: '2020-01-01', valid: true },
          { value: '1985-04-12T23:20:50.52Z', valid: false },
          { value: 'asdfasdf', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'date-time',
        tests: [
          { value: '2020-01-01', valid: false },
          { value: '1985-04-12T23:20:50.52Z', valid: true },
          { value: 'asdfasdf', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'time',
        tests: [
          { value: '23:20:50.52Z', valid: true },
          { value: '2020-01-01', valid: false },
          { value: '1985-04-12T23:20:50.52Z', valid: false },
          { value: 'asdfasdf', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'duration',
        tests: [
          { value: 'P3Y6M4DT12H30M5S', valid: true },
          { value: 'P23DT23H', valid: true },
          { value: 'P3Y6M4DT12H30M5', valid: false },
          { value: 'asdfasdf', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'email',
        tests: [
          { value: 'test@gmail.com', valid: true },
          { value: 'æøå@gmail.com', valid: false },
          { value: 'asdfasdf', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'idn-email',
        tests: [
          { value: 'test@gmail.com', valid: true },
          { value: 'æøå@gmail.com', valid: true },
          { value: 'asdfasdf', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'hostname',
        tests: [
          { value: 'altinn.no', valid: true },
          { value: 'altinnæøå.no.', valid: false },
          { value: 'altinn/studio', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'idn-hostname',
        tests: [
          { value: 'altinn.no', valid: true },
          { value: 'altinnæøå.no.', valid: true },
          { value: 'altinn/studio', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'ipv4',
        tests: [
          { value: '192.168.10.101', valid: true },
          { value: '192.168.10.999', valid: false },
          { value: 'asdfasdf', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'ipv6',
        tests: [
          { value: '2001:0db8:85a3:0000:0000:8a2e:0370:7334', valid: true },
          { value: '2001:0db8:85a3::8a2e:0370:7334', valid: true },
          { value: '2001:0db8:85a3::8a2e:0370:733m', valid: false },
          { value: 'asdfasdf', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'uuid',
        tests: [
          { value: '123e4567-e89b-12d3-a456-426614174000', valid: true },
          { value: '123e4567-e89b-12d3-a456-42661417400g', valid: false },
          { value: 'asdfasdf', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'uri',
        tests: [
          { value: 'http://altinn.no', valid: true },
          { value: 'http://altinn.no/æøå', valid: false },
          { value: '#/hei', valid: false },
          { value: 'asdfasdf', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'uri-reference',
        tests: [
          { value: 'http://altinn.no', valid: true },
          { value: '#/hei', valid: true },
          { value: '%%', valid: false },
          { value: '#/æøå', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'iri',
        tests: [
          { value: 'http://altinn.no/æøå', valid: true },
          { value: 'asdfasdf', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'iri-reference',
        tests: [
          { value: 'http://altinn.no/æøå', valid: true },
          { value: '#/æøå', valid: true },
          { value: 'javascript:;', valid: false }, // It was hard to find an invalid case, not sure why this is invalid
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'uri-template',
        tests: [
          { value: 'http://{org}.apps.altinn.no/{org}/{app}', valid: true },
          { value: 'http://altinn.no/', valid: true },
          { value: 'htt%p://altinn.no', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'json-pointer',
        tests: [
          { value: '/foo/bar', valid: true },
          { value: '0', valid: false },
          { value: '1/a~1b', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'relative-json-pointer',
        tests: [
          { value: '/foo/bar', valid: false },
          { value: '0', valid: true },
          { value: '1/a~1b', valid: true },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
      {
        format: 'regex',
        tests: [
          { value: '^\\d{4}-\\d{2}-\\d{2}$', valid: true },
          { value: '^\\d{4}-\\d{2}-(\\d{2}$', valid: false },
          { value: '', valid: true },
          { value: null, valid: true },
          { value: undefined, valid: true },
        ],
      },
    ];

    formatTests.forEach(({ format, tests }) => {
      describe(format, () => {
        tests.forEach(({ value, valid }) => {
          it(`${value} should ${valid ? 'be valid' : 'not be valid'}`, async () => {
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
            jest.spyOn(DataModels, 'useDataModelSchema').mockReturnValue(schema);
            jest.spyOn(DataModels, 'useDataElementIdForDataType').mockReturnValue(defaultMockDataElementId);
            jest.spyOn(UseBindingSchema, 'useDataModelType').mockReturnValue({} as IDataType);

            const updateDataModelValidations = jest.fn();
            jest
              .spyOn(Validation, 'useUpdateDataModelValidations')
              .mockImplementation(() => updateDataModelValidations);

            render(<SchemaValidation dataType='mockDataType' />);

            // If valid, expect empty validations object
            // If not valid, expect an object containing at least field and severity
            const expectedValidations = valid
              ? {}
              : expect.objectContaining({
                  field: expect.arrayContaining([expect.objectContaining({ field: 'field', severity: 'error' })]),
                });

            expect(updateDataModelValidations).toHaveBeenCalledWith(
              'schema',
              defaultMockDataElementId,
              expectedValidations,
            );
          });
        });
      });
    });
  });
});

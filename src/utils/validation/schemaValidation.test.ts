import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import { v4 as uuid } from 'uuid';

import { staticUseLanguageForTests } from 'src/hooks/useLanguage';
import { createValidator, getSchemaValidationErrors } from 'src/utils/validation/schemaValidation';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IJsonSchemas } from 'src/features/datamodel';
import type { IFormData } from 'src/features/formData';
import type { ILayoutSets } from 'src/types';
import type { IDataType, IInstance, IProcess, ITask } from 'src/types/shared';

function runGetSchemaValidationErrors(formData: IFormData, schema: object) {
  const layoutName = 'layout';
  const taskId = 'task';
  const dataTypeId = uuid(); // Validators object is stored as a singleton, so we need a unique id for each dataType

  const attachments = {};
  const langTools = staticUseLanguageForTests({ language: {} });
  const application: IApplicationMetadata = {
    dataTypes: [
      {
        taskId,
        id: dataTypeId,
      } as IDataType,
    ],
  } as IApplicationMetadata;
  const instance: IInstance = {
    process: { currentTask: { elementId: taskId } as ITask } as IProcess,
  } as IInstance;
  const layoutSets: ILayoutSets = {
    sets: [
      {
        id: layoutName,
        dataType: dataTypeId,
        tasks: [taskId],
      },
    ],
  };
  const schemas: IJsonSchemas = { [dataTypeId]: schema };

  return getSchemaValidationErrors({
    attachments,
    langTools,
    formData,
    application,
    instance,
    layoutSets,
    schemas,
    customValidation: null,
  });
}

describe('schemaValidation', () => {
  describe('createValidator', () => {
    const schema = {
      id: 'schema.json',
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
    const dataType: IDataType = {
      id: 'test',
      maxCount: 1,
      minCount: 1,
      appLogic: {
        classRef: 'Altinn.App.Models.SomeClassName',
      },
      allowedContentTypes: ['application/xml'],
    };

    it('when receiving a 2020-12 draft schema it should create ajv2020 validator instance', () => {
      const result = createValidator(
        {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          ...schema,
        },
        dataType,
      );
      expect(result.validator).toBeInstanceOf(Ajv2020);
    });

    it('when receiving anything but 2020-12 draft schema it should create ajv validator instance', () => {
      const result = createValidator(
        {
          $schema: 'http://json-schema.org/schema#',
          ...schema,
        },
        dataType,
      );
      expect(result.validator).toBeInstanceOf(Ajv);
    });
  });

  describe('format validation', () => {
    const formatTests = [
      {
        format: 'date',
        tests: [
          { value: '2020-01-01', expected: true },
          { value: '1985-04-12T23:20:50.52Z', expected: false },
          { value: 'asdfasdf', expected: false },
        ],
      },
      {
        format: 'date-time',
        tests: [
          { value: '2020-01-01', expected: false },
          { value: '1985-04-12T23:20:50.52Z', expected: true },
          { value: 'asdfasdf', expected: false },
        ],
      },
      {
        format: 'time',
        tests: [
          { value: '23:20:50.52Z', expected: true },
          { value: '2020-01-01', expected: false },
          { value: '1985-04-12T23:20:50.52Z', expected: false },
          { value: 'asdfasdf', expected: false },
        ],
      },
      {
        format: 'duration',
        tests: [
          { value: 'P3Y6M4DT12H30M5S', expected: true },
          { value: 'P23DT23H', expected: true },
          { value: 'P3Y6M4DT12H30M5', expected: false },
          { value: 'asdfasdf', expected: false },
        ],
      },
      {
        format: 'email',
        tests: [
          { value: 'test@gmail.com', expected: true },
          { value: 'æøå@gmail.com', expected: false },
          { value: 'asdfasdf', expected: false },
        ],
      },
      {
        format: 'idn-email',
        tests: [
          { value: 'test@gmail.com', expected: true },
          { value: 'æøå@gmail.com', expected: true },
          { value: 'asdfasdf', expected: false },
        ],
      },
      {
        format: 'hostname',
        tests: [
          { value: 'altinn.no', expected: true },
          { value: 'altinnæøå.no.', expected: false },
          { value: 'altinn/studio', expected: false },
        ],
      },
      {
        format: 'idn-hostname',
        tests: [
          { value: 'altinn.no', expected: true },
          { value: 'altinnæøå.no.', expected: true },
          { value: 'altinn/studio', expected: false },
        ],
      },
      {
        format: 'ipv4',
        tests: [
          { value: '192.168.10.101', expected: true },
          { value: '192.168.10.999', expected: false },
          { value: 'asdfasdf', expected: false },
        ],
      },
      {
        format: 'ipv6',
        tests: [
          { value: '2001:0db8:85a3:0000:0000:8a2e:0370:7334', expected: true },
          { value: '2001:0db8:85a3::8a2e:0370:7334', expected: true },
          { value: '2001:0db8:85a3::8a2e:0370:733m', expected: false },
          { value: 'asdfasdf', expected: false },
        ],
      },
      {
        format: 'uuid',
        tests: [
          { value: '123e4567-e89b-12d3-a456-426614174000', expected: true },
          { value: '123e4567-e89b-12d3-a456-42661417400g', expected: false },
          { value: 'asdfasdf', expected: false },
        ],
      },
      {
        format: 'uri',
        tests: [
          { value: 'http://altinn.no', expected: true },
          { value: 'http://altinn.no/æøå', expected: false },
          { value: '#/hei', expected: false },
          { value: 'asdfasdf', expected: false },
        ],
      },
      {
        format: 'uri-reference',
        tests: [
          { value: 'http://altinn.no', expected: true },
          { value: '#/hei', expected: true },
          { value: '%%', expected: false },
          { value: '#/æøå', expected: false },
        ],
      },
      {
        format: 'iri',
        tests: [
          { value: 'http://altinn.no/æøå', expected: true },
          { value: 'asdfasdf', expected: false },
        ],
      },
      {
        format: 'iri-reference',
        tests: [
          { value: 'http://altinn.no/æøå', expected: true },
          { value: '#/æøå', expected: true },
          { value: 'javascript:;', expected: false }, // It was hard to find an invalid case, not sure why this is invalid
        ],
      },
      {
        format: 'uri-template',
        tests: [
          { value: 'http://{org}.apps.altinn.no/{org}/{app}', expected: true },
          { value: 'http://altinn.no/', expected: true },
          { value: 'htt%p://altinn.no', expected: false },
        ],
      },
      {
        format: 'json-pointer',
        tests: [
          { value: '/foo/bar', expected: true },
          { value: '0', expected: false },
          { value: '1/a~1b', expected: false },
        ],
      },
      {
        format: 'relative-json-pointer',
        tests: [
          { value: '/foo/bar', expected: false },
          { value: '0', expected: true },
          { value: '1/a~1b', expected: true },
        ],
      },
      {
        format: 'regex',
        tests: [
          { value: '^\\d{4}-\\d{2}-\\d{2}$', expected: true },
          { value: '^\\d{4}-\\d{2}-(\\d{2}$', expected: false },
        ],
      },
    ];

    formatTests.forEach(({ format, tests }) => {
      describe(format, () => {
        tests.forEach(({ value, expected }) => {
          it(`${value} should ${expected ? 'be valid' : 'not be valid'}`, () => {
            const formData = {
              field: value,
            };
            const schema = {
              $schema: 'https://json-schema.org/draft/2020-12/schema',
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  format,
                },
              },
            };
            const result = runGetSchemaValidationErrors(formData, schema);
            expect(result).toHaveLength(expected ? 0 : 1);
          });
        });
      });
    });
  });
});

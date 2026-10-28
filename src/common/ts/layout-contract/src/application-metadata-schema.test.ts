import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

import applicationMetadataSchema from '../schemas/json/application/application-metadata.schema.v1.json';

const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validate = ajv.compile(applicationMetadataSchema);

function metadataWithDataType(dataType: Record<string, unknown>) {
  return {
    id: 'ttd/app',
    title: { nb: 'App' },
    org: 'ttd',
    partyTypesAllowed: {
      bankruptcyEstate: false,
      organisation: false,
      person: true,
      subUnit: false,
    },
    dataTypes: [{ id: 'model', ...dataType }],
  };
}

describe('application metadata schema', () => {
  it.each([
    { taskId: 'Task_1' },
    { taskIds: ['Task_1', 'Task_2'] },
    { taskIds: [] },
    { taskIds: null },
    { taskId: 'Task_1', taskIds: ['Task_2'] },
  ])('accepts a data type with %o', (dataType) => {
    expect(validate(metadataWithDataType(dataType)), JSON.stringify(validate.errors)).toBe(true);
  });

  it.each([
    { taskIds: ['Task_1', 'Task_1'] },
    { taskIds: [''] },
    { taskIds: [1] },
    { taskIds: 'Task_1' },
    { taskId: ['Task_1'] },
  ])('rejects a data type with %o', (dataType) => {
    expect(validate(metadataWithDataType(dataType))).toBe(false);
  });
});

import { expectSaga } from 'redux-saga-test-plan';
import { autosaveModelSaga, autoSavePropsSelector } from './schemaEditorSaga';
import { select } from 'redux-saga/effects'
import { put } from 'app-shared/utils/networking';
import axios from 'axios';
import { buildUiSchema } from '@altinn/schema-model';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('schemaEditorSaga', () => {
  let spy: any;
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  })
  afterAll(() => {
    spy.mockRestore();
  })
  const jsonschema = {
    properties: {
      test: {
        type: 'string',
      },
    },
  };
  const uiSchema = buildUiSchema(jsonschema);
  describe('AutosaveModeSaga', () => {
    test('successful autosave', () => {
      mockedAxios.put.mockResolvedValueOnce("test");
      return expectSaga(autosaveModelSaga)
      .provide([
        [select(autoSavePropsSelector), { uiSchema, saveUrl: 'test' }],
      ])
      .call(put, `test&saveOnly=true`, {...jsonschema})
      .run();
    })
  });
  describe('AutosaveModeSaga', () => {
    test('failing autosave', () => {
      console.error = jest.fn();
      mockedAxios.put.mockRejectedValueOnce("error");
      return expectSaga(autosaveModelSaga)
      .provide([
        [select(autoSavePropsSelector), { uiSchema, saveUrl: 'test' }],
      ])
      .call(put, `test&saveOnly=true`, {...jsonschema})
      .run();

      expect(console.error).toHaveBeenCalledWith('Failed to save JSON Schema model. ', 'error');
    })
  });
})

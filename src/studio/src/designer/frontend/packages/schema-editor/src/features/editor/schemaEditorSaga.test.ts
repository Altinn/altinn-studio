import { expectSaga } from 'redux-saga-test-plan';
import { autosaveModelSaga, autoSavePropsSelector } from './schemaEditorSaga';
import { select } from 'redux-saga/effects'
import { put } from 'app-shared/utils/networking';
import { buildUiSchema } from '@altinn/schema-model';

describe('schemaEditorSaga', () => {
  const jsonschema = {
    properties: {
      test: {
        type: 'string',
      },
    },
  };
  const uiSchema = buildUiSchema(jsonschema);
  describe('AutosaveModeSaga', () => {
    test('autosave', () => {
      return expectSaga(autosaveModelSaga)
      .provide([
        [select(autoSavePropsSelector), { uiSchema, saveUrl: 'test' }],
      ])
      .call(put, `test&saveOnly=true`, {...jsonschema})
      .run();
    })
  })
})

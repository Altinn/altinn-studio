import {SagaIterator} from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects'
import { put } from 'app-shared/utils/networking';
import { SchemaEditorActions } from './schemaEditorSlice';
import { ISchemaState } from '../../types';
import { buildJsonSchema } from '@altinn/schema-model';

export function* AutosaveModelSaga(): SagaIterator {
  const {uiSchema, saveUrl} = yield select((state: ISchemaState) => {
    return { uiSchema: state.uiSchema, saveUrl: state.saveSchemaUrl}
  });

  const schema = buildJsonSchema(uiSchema);
  yield call(put, `${saveUrl}&saveOnly=true`, schema);
}

export function* watchAutosaveModelSaga(): SagaIterator {
  yield takeLatest([
    SchemaEditorActions.addCombinationItem,
    SchemaEditorActions.addEnum,
    SchemaEditorActions.addProperty,
    SchemaEditorActions.addRootItem,
    SchemaEditorActions.deleteCombinationItem,
    SchemaEditorActions.deleteEnum,
    SchemaEditorActions.deleteField,
    SchemaEditorActions.deleteProperty,
    SchemaEditorActions.promoteProperty,
    SchemaEditorActions.setCombinationType,
    SchemaEditorActions.setDescription,
    SchemaEditorActions.setItems,
    SchemaEditorActions.setPropertyName,
    SchemaEditorActions.setRef,
    SchemaEditorActions.setRequired,
    SchemaEditorActions.setRestriction,
    SchemaEditorActions.setTitle,
    SchemaEditorActions.setType,
    SchemaEditorActions.toggleArrayField,
  ], AutosaveModelSaga);
}

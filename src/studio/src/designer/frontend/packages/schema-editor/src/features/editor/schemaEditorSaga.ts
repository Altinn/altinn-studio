import {SagaIterator} from 'redux-saga';
import { call, put, select, takeLatest } from 'redux-saga/effects'
import { put as apiPut } from 'app-shared/utils/networking';
import { SchemaEditorActions } from './schemaEditorSlice';
import { ISchemaState } from '../../types';

export function* AutosaveModelSaga(): SagaIterator {
  const saveUrl = yield select((state: ISchemaState) => state.saveSchemaUrl);
  yield put(SchemaEditorActions.updateJsonSchema({}));
  const schema = yield select((state: ISchemaState) => state.schema);
  yield call(apiPut, `${saveUrl}&saveOnly=true`, schema);
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

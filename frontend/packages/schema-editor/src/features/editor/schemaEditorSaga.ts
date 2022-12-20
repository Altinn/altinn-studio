import type { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { put } from 'app-shared/utils/networking';
import { SchemaEditorActions } from './schemaEditorSlice';
import type { ISchemaState } from '../../types';
import { buildJsonSchema } from '@altinn/schema-model';

export const autoSavePropsSelector = (state: ISchemaState) => {
  return { uiSchema: state.uiSchema, saveUrl: state.saveSchemaUrl };
};

export function* autosaveModelSaga(): SagaIterator {
  try {
    const { uiSchema, saveUrl } = yield select(autoSavePropsSelector);

    const schema = buildJsonSchema(uiSchema);
    yield call(put, `${saveUrl}&saveOnly=true`, schema);
  } catch (error) {
    yield call(console.error, 'Failed to save JSON Schema model. ', error);
  }
}

export function* watchAutosaveModelSaga(): SagaIterator {
  yield takeLatest(
    [
      SchemaEditorActions.addCombinationItem,
      SchemaEditorActions.addEnum,
      SchemaEditorActions.addProperty,
      SchemaEditorActions.addRootItem,
      SchemaEditorActions.changeChildrenOrder,
      SchemaEditorActions.deleteCombinationItem,
      SchemaEditorActions.deleteEnum,
      SchemaEditorActions.deleteProperty,
      SchemaEditorActions.promoteProperty,
      SchemaEditorActions.setCombinationType,
      SchemaEditorActions.setDescription,
      SchemaEditorActions.setPropertyName,
      SchemaEditorActions.setRef,
      SchemaEditorActions.setRequired,
      SchemaEditorActions.setRestriction,
      SchemaEditorActions.setTitle,
      SchemaEditorActions.setType,
      SchemaEditorActions.toggleArrayField,
    ],
    autosaveModelSaga
  );
}

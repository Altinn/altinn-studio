import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select } from 'redux-saga/effects';
import * as FormDesignerActions from '../../actions/formDesignerActions/actions';
import FormDesignerActionDispatchers from '../../actions/formDesignerActions/formDesignerActionDispatcher';
import * as FormDesignerActionTypes from '../../actions/formDesignerActions/formDesignerActionTypes';
import { get, post } from '../../utils/networking';
// tslint:disable-next-line:no-var-requires
const uuid = require('uuid/v4');

function* addFormComponentSaga({
  component,
  callback,
}: FormDesignerActions.IAddFormComponentAction): SagaIterator {
  try {
    const id: string = uuid();
    yield call(
      FormDesignerActionDispatchers.addFormComponentFulfilled,
      component,
      id,
      callback
    );
  } catch (err) {
    yield call(FormDesignerActionDispatchers.addFormComponentRejected, err);
  }
}

export function* watchAddFormComponentSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.ADD_FORM_COMPONENT,
    addFormComponentSaga
  );
}

function* deleteFormComponentSaga({
  id
}: FormDesignerActions.IDeleteComponentAction): SagaIterator {
  try {
    yield call(FormDesignerActionDispatchers.deleteFormComponentFulfilled, id);
  } catch (err) {
    yield call(FormDesignerActionDispatchers.deleteFormComponentRejected, err);
  }
}

export function* watchDeleteFormComponentSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.DELETE_FORM_COMPONENT,
    deleteFormComponentSaga
  );
}

function* fetchFormLayoutSaga({
  url
}: FormDesignerActions.IFetchFormLayoutAction): SagaIterator {
  try {
    const formLayout = yield call(get, url);
    yield call(
      FormDesignerActionDispatchers.fetchFormLayoutFulfilled,
      formLayout.data
    );
  } catch (err) {
    yield call(FormDesignerActionDispatchers.fetchFormLayoutRejected, err);
  }
}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.FETCH_FORM_LAYOUT,
    fetchFormLayoutSaga
  );
}

function* saveFormLayoutSaga({
  url
}: FormDesignerActions.ISaveFormLayoutAction): SagaIterator {
  try {
    const formLayout: IAppState = yield select();
    yield call(post, url, {
      data: {
        components: formLayout.formDesigner.layout.components,
        order: formLayout.formDesigner.layout.order
      }
    });
    yield call(FormDesignerActionDispatchers.saveFormLayoutFulfilled);
  } catch (err) {
    yield call(FormDesignerActionDispatchers.saveFormLayoutRejected, err);
  }
}

export function* watchSaveFormLayoutSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.SAVE_FORM_LAYOUT,
    saveFormLayoutSaga
  );
}

function* updateDataModelBindingSaga({
  dataModelBinding,
  id
}: FormDesignerActions.IUpdateDataModelBindingAction): SagaIterator {
  try {
    yield call(
      FormDesignerActionDispatchers.updateDataModelBindingFulfilled,
      dataModelBinding,
      id
    );
  } catch (err) {
    yield call(
      FormDesignerActionDispatchers.updateDataModelBindingRejected,
      err
    );
  }
}

export function* watchUpdateDataModelBindingSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.UPDATE_DATA_MODEL_BINDING,
    updateDataModelBindingSaga
  );
}

function* updateFormComponentSaga({
  updatedComponent,
  id
}: FormDesignerActions.IUpdateFormComponentAction): SagaIterator {
  try {
    yield call(
      FormDesignerActionDispatchers.updateFormComponentFulfilled,
      updatedComponent,
      id
    );
  } catch (err) {
    yield call(FormDesignerActionDispatchers.updateFormComponentRejected, err);
  }
}

export function* watchUpdateFormComponentSaga(): SagaIterator {
  yield takeLatest(
    FormDesignerActionTypes.UPDATE_FORM_COMPONENT,
    updateFormComponentSaga
  );
}

import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import * as FormFillerActions from '../../actions/formFillerActions/actions/index';
import FormFillerActionDispatcher from '../../actions/formFillerActions/formFillerActionDispatcher';
import * as FormFillerActionTypes from '../../actions/formFillerActions/formFillerActionTypes';
import { IAppDataState } from '../../reducers/appDataReducer';
import { convertDataBindingToModel, convertModelToDataBinding } from '../../utils/databindings';
import { get, put } from '../../utils/networking';
import * as Validator from '../../utils/validation';

const selectAppData = (state: IAppState): IAppDataState => state.appData;

export function* updateFormDataSaga({
  formData,
  componentID,
  dataModelElement
}: FormFillerActions.IUpdateFormDataAction): SagaIterator {
  try {
    const state: IAppState = yield select();
    if (!dataModelElement) {
      return;
    }
    const validationErrors = Validator.validateDataModel(
      formData,
      dataModelElement,
      state.formDesigner.layout.components[componentID],
    );
    yield call(
      FormFillerActionDispatcher.updateFormDataFulfilled,
      componentID,
      formData,
      dataModelElement,
      validationErrors,
    );
  } catch (err) {
    yield call(FormFillerActionDispatcher.updateFormDataRejected, err);
  }
}

export function* watchUpdateFormDataSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.UPDATE_FORM_DATA, updateFormDataSaga);
}

export function* submitFormDataSaga({ url }: FormFillerActions.ISubmitFormDataAction): SagaIterator {
  try {
    const state: IAppState = yield select();
    const validationErrorObj: any = {};
    // Validating entire form before trying to commit
    Object.keys(state.formDesigner.layout.components).map(componentkey => {
      const component = state.formDesigner.layout.components[componentkey];
      if (component.dataModelBinding) {
        const modelBinding = component.dataModelBinding;
        const formData = state.formFiller.formData ?
          (state.formFiller.formData[modelBinding] || '') : '';
        const dataModelElement = state.appData.dataModel.model.find(
          element => element.DataBindingName === modelBinding);
        const valErrors = Validator.validateDataModel(formData, dataModelElement, component);
        if (valErrors.length > 0) {
          validationErrorObj[componentkey] = valErrors;
        }
      }
    });

    if (Object.keys(validationErrorObj).length === 0) {
      yield call(put, url, 'Update', yield convertDataBindingToModel(state.formFiller.formData));
      yield call(FormFillerActionDispatcher.submitFormDataFulfilled);
    } else {
      // Update validationError state if schema contains errors
      yield call(FormFillerActionDispatcher.updateValidationErrors, validationErrorObj);
    }
  } catch (err) {
    if (err.response && err.response.status === 303) {
      yield call(FormFillerActionDispatcher.submitFormDataFulfilled);
      yield call(FormFillerActionDispatcher.fetchFormData, url + '/Read');
    } else {
      yield call(FormFillerActionDispatcher.submitFormDataRejected, err);
    }
  }
}

export function* watchSubmitFormDataSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.SUBMIT_FORM_DATA, submitFormDataSaga);
}

export function* fetchFormDataSaga({ url }: FormFillerActions.IFetchFormDataAction): SagaIterator {
  try {
    const formData = yield call(get, url);
    const appDataState: IAppDataState = yield select(selectAppData);
    yield call(
      FormFillerActionDispatcher.fetchFormDataFulfilled,
      convertModelToDataBinding(formData, appDataState.dataModel.model),
    );
  } catch (err) {
    yield call(FormFillerActionDispatcher.fetchFormDataRejected, err);
  }
}

export function* watchFetchFormDataSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.FETCH_FORM_DATA, fetchFormDataSaga);
}
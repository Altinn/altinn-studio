import { AxiosRequestConfig } from 'axios';
import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import FormDesignerActionDispatchers from '../../actions/formDesignerActions/formDesignerActionDispatcher';
import * as FormFillerActions from '../../actions/formFillerActions/actions/index';
import FormFillerActionDispatcher from '../../actions/formFillerActions/formFillerActionDispatcher';
import * as FormFillerActionTypes from '../../actions/formFillerActions/formFillerActionTypes';
import WorkflowActionDispatcher from '../../actions/workflowActions/worflowActionDispatcher';
import { IAppDataState } from '../../reducers/appDataReducer';
import { convertDataBindingToModel, convertModelToDataBinding } from '../../utils/databindings';
import { get, post, put } from '../../utils/networking';
import * as Validator from '../../utils/validation';

const selectAppData = (state: IAppState): IAppDataState => state.appData;

export function* updateFormDataSaga({
  formData,
  componentID,
  dataModelElement,
  dataModelBinding,
}: FormFillerActions.IUpdateFormDataAction): SagaIterator {
  try {
    const state: IAppState = yield select();
    if (!dataModelElement) {
      return;
    }

    let validationErrors = [];
    validationErrors = Validator.validateDataModel(
      formData,
      dataModelElement,
      state.formDesigner.layout.components[componentID],
    );

    yield call(
      FormFillerActionDispatcher.updateFormDataFulfilled,
      componentID,
      formData,
      dataModelBinding,
      validationErrors,
    );
  } catch (err) {
    yield call(FormFillerActionDispatcher.updateFormDataRejected, err);
  }
}

export function* watchUpdateFormDataSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.UPDATE_FORM_DATA, updateFormDataSaga);
}

export function* submitFormDataSaga({ url, apiMode }: FormFillerActions.ISubmitFormDataAction): SagaIterator {
  try {
    const state: IAppState = yield select();

    // Validating entire form before trying to commit
    const valErrors = Validator.validateFormData(state.formFiller.formData, state.appData.dataModel.model,
      state.formDesigner.layout.components);
    if (Object.keys(valErrors).length === 0) {
      const apiResult = yield call(put, url, apiMode || 'Update', convertDataBindingToModel(state.formFiller.formData,
        state.appData.dataModel.model));
      yield call(FormFillerActionDispatcher.submitFormDataFulfilled, apiResult);
      if (apiResult.status === 0 && apiResult.nextState) {
        WorkflowActionDispatcher.setCurrentState(apiResult.nextState);
      }
      if (apiResult.status === 0 && apiResult.nextStepUrl && !apiResult.nextStepUrl.contains('#Preview')) {
        // If next step is placed somewhere other then the SPA, for instance payment, we must redirect.
        // This is just a "POC" that this can be done
        if (window.location.pathname.split('/')[1].toLowerCase() === 'runtime') {
          window.location.replace(`${window.location.origin}${apiResult.nextStepUrl}`);
        }
      }
    } else {
      // Update validationError state if schema contains errors
      yield call(FormFillerActionDispatcher.updateValidationErrors, valErrors);
    }
  } catch (err) {
    if (err.response && err.response.status === 303) {
      yield call(FormFillerActionDispatcher.submitFormDataFulfilled, err);
      yield call(FormFillerActionDispatcher.fetchFormData, url + '/Read');
    } else if (err.response && err.response.data &&
      (err.response.data.status === 1 || err.response.data.status === 2)) {
      // Update validationError state if response contains validation errors
      const validationErrors: any = err.response.data.validationResult.errors;
      yield call(FormFillerActionDispatcher.updateValidationErrors, validationErrors);
      yield call(FormFillerActionDispatcher.submitFormDataRejected, err);
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
    yield call(FormDesignerActionDispatchers.generateRepeatingGroupsAction);
  } catch (err) {
    yield call(FormFillerActionDispatcher.fetchFormDataRejected, err);
  }
}

export function* watchFetchFormDataSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.FETCH_FORM_DATA, fetchFormDataSaga);
}

export function* resetFormDataSaga({ url }: FormFillerActions.IResetFormDataAction): SagaIterator {
  try {
    const formData = yield call(get, url);
    const appDataState: IAppDataState = yield select(selectAppData);
    yield call(FormFillerActionDispatcher.resetFormDataFulfilled,
      convertModelToDataBinding(formData, appDataState.dataModel.model));
    yield call(FormDesignerActionDispatchers.generateRepeatingGroupsAction);
  } catch (err) {
    yield call(FormFillerActionDispatcher.fetchFormDataRejected, err);
  }
}

export function* watchResetFormDataSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.RESET_FORM_DATA, resetFormDataSaga);
}

export function* runSingleFieldValidationSaga({
  url,
  dataModelBinding,
}: FormFillerActions.IRunSingleFieldValidationAction): SagaIterator {
  const state: IAppState = yield select();
  try {
    const requestBody = convertDataBindingToModel(state.formFiller.formData, state.appData.dataModel.model);
    const config: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: dataModelBinding,
      },
    };
    const response = yield call(put, url, 'Validate', requestBody, config, dataModelBinding);
    if (response && response.validationResult) {
      // Update validationError state
      const validationErrors: any = response.validationResult.errors;
      yield call(FormFillerActionDispatcher.runSingleFieldValidationFulfilled, validationErrors);
    }
  } catch (err) {
    yield call(FormFillerActionDispatcher.runSingleFieldValidationRejected, err);
  }
}

export function* watchRunSingleFieldValidationSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.RUN_SINGLE_FIELD_VALIDATION, runSingleFieldValidationSaga);
}

export function* completeAndSendInFormSaga({ url }: FormFillerActions.ICompleteAndSendInForm): SagaIterator {
  try {
    const response = yield call(post, url);
    if (response.data.status === 0) {
      yield call(FormFillerActionDispatcher.completeAndSendInFormFulfilled);
      yield call(WorkflowActionDispatcher.setCurrentState, response.data.nextState);
    } else {
      yield call(FormFillerActionDispatcher.completeAndSendInFormRejected);
    }
  } catch (err) {
    yield call(FormFillerActionDispatcher.completeAndSendInFormRejected);
  }
}

export function* watchCompleteAndSendInFormSaga(): SagaIterator {
  yield takeLatest(FormFillerActionTypes.COMPLETE_AND_SEND_IN_FORM, completeAndSendInFormSaga);
}

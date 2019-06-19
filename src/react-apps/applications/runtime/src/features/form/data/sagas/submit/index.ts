import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from 'src/types';
import { IRuntimeStore } from '../../../../../types/global';
import { convertDataBindingToModel } from '../../../../../utils/databindings';
import { put } from '../../../../../utils/networking';
import {
  canFormBeSaved, mapApiValidationsToRedux, validateEmptyFields, validateFormComponents,
  validateFormData,
} from '../../../../../utils/validation';
import { ILayoutState } from '../../../layout/reducer';
import FormValidationActions from '../../../validation/actions';
import WorkflowActions from '../../../workflow/actions';
import FormDataActions from '../../actions';
import {
  ISubmitDataAction,
} from '../../actions/submit';
import * as FormDataActionTypes from '../../actions/types';

const LayoutSelector: (store: IRuntimeStore) => ILayoutState = (store: IRuntimeStore) => store.formLayout;

function* submitFormSaga({ url, apiMode }: ISubmitDataAction): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const model = convertDataBindingToModel(state.formData, state.formDataModel.dataModel);
    let validations = validateFormData(state.formData, state.formDataModel.dataModel, state.formLayout.layout,
      state.language.language);
    const componentSpesificValidations =
      validateFormComponents(state.formAttachments.attachments, state.formLayout.layout,
        state.language.language);
    const emptyFieldsValidations =
      validateEmptyFields(state.formData.formData, state.formLayout.layout, state.language.language);

    validations = Object.assign(validations, componentSpesificValidations);
    validations = Object.assign(validations, emptyFieldsValidations);
    if (canFormBeSaved(validations)) {
      const result = yield call(put, url, apiMode || 'Update', model);
      yield call(FormDataActions.submitFormDataFulfilled);
      if (result.status === 0 && result.nextState) {
        WorkflowActions.setCurrentState(result.nextState);
      }
      if (result.status === 0 && result.nextStepUrl && !result.nextStepUrl.includes('#Preview')) {
        // If next step is placed somewhere other then the SPA, for instance payment, we must redirect.
        if (window.location.pathname.split('/')[1].toLowerCase() === 'runtime') {
          window.location.replace(`${window.location.origin}${result.nextStepUrl}`);
        }
      }
    } else {
      FormValidationActions.updateValidations(validations);
    }
  } catch (err) {
    console.error(err);
    yield call(FormDataActions.submitFormDataRejected, err);
    if (err.response && err.response.status === 303) {
      yield call(FormDataActions.fetchFormData, url);
    } else if (err.response && err.response.data &&
      (err.response.data.status === 1 || err.response.data.status === 2)) {
      const validationResult = err.response.data.validationResult;
      if (validationResult && validationResult.messages) {
        // If api returns validation errors, map these to redux format and update state
        const layoutState: ILayoutState = yield select(LayoutSelector);
        const validations = mapApiValidationsToRedux(err.response.data.validationResult.messages, layoutState.layout);
        FormValidationActions.updateValidations(validations);
      }
    }
  }
}

export function* watchSubmitFormSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.SUBMIT_FORM_DATA, submitFormSaga);
}

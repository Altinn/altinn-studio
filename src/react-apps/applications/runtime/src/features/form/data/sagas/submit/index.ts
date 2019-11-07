import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { get, put } from 'Shared/utils/networking';
import { IRuntimeState } from 'src/types';
import ProcessDispatcher from '../../../../../sharedResources/process/processDispatcher';
import { IRuntimeStore, IValidationIssue } from '../../../../../types/global';
import { convertDataBindingToModel } from '../../../../../utils/databindings';
import { getDataElementUrl, getValidationUrl } from '../../../../../utils/urlHelper';
import {
  canFormBeSaved, mapApiValidationsToRedux, mapDataElementValidationToRedux, validateEmptyFields,
  validateFormComponents,
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
    const model = convertDataBindingToModel(state.formData.formData, state.formDataModel.dataModel);
    let validations = validateFormData(state.formData, state.formDataModel.dataModel, state.formLayout.layout,
      state.language.language);
    const componentSpesificValidations =
      validateFormComponents(state.attachments.attachments, state.formLayout.layout,
        state.language.language);
    const emptyFieldsValidations =
      validateEmptyFields(state.formData.formData, state.formLayout.layout, state.language.language);

    validations = Object.assign(validations, componentSpesificValidations);
    if (apiMode === 'Complete') {
      validations = Object.assign(validations, emptyFieldsValidations);
    }
    if (canFormBeSaved(validations)) {
      // updates the default data element
      const defaultDataElementGuid = state.instanceData.instance.data.find((e) => e.elementType === 'default').id;
      yield call(put, getDataElementUrl(defaultDataElementGuid), model);

      if (apiMode === 'Complete') {
        // run validations against the datamodel
        const instanceId = state.instanceData.instance.id;
        const validationResult = yield call(get, getValidationUrl(instanceId, defaultDataElementGuid));
        if (validationResult && validationResult.length > 0) {
          // we have validation errors, update validations and return
          const layoutState = yield select(LayoutSelector);
          const mappedValidations = mapDataElementValidationToRedux(validationResult, layoutState);
          FormValidationActions.updateValidations(mappedValidations);
          return yield call(FormDataActions.submitFormDataRejected, null);
        } else {
          // data has no validation errors, we complete the current step
          yield call(ProcessDispatcher.completeProcess);
        }
      }

      yield call(FormDataActions.submitFormDataFulfilled);

      /* OLD IMPLEMENTATION
      console.log('### FORMCANBESAVED, URL: ', url, ' apimode: ', apiMode, ' model: ', model);
      const result = yield call(put, url, apiMode || 'Update', model);
      yield call(FormDataActions.submitFormDataFulfilled);
      console.log('### RESULT: ', result);
      if (result.status === 0 && result.nextState) {
        WorkflowActions.setCurrentState(result.nextState);
      }
      const currentUrl = window.location.href.replace(window.location.origin, '');
      if (result.status === 0 && result.nextStepUrl && result.nextStepUrl !== currentUrl) {
        // If next step is placed somewhere other then the SPA, for instance payment, we must redirect.
        if (window.location.pathname.split('/')[1].toLowerCase() === 'runtime') {
          window.location.replace(`${window.location.origin}${result.nextStepUrl}`);
        }
      }
      */
    } else {
      FormValidationActions.updateValidations(validations);
    }
  } catch (err) {
    console.error(err);
    yield call(FormDataActions.submitFormDataRejected, err);
    if (err.response && err.response.status === 303) {
      yield call(FormDataActions.fetchFormData, url);
    }
  }
}

export function* watchSubmitFormSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.SUBMIT_FORM_DATA, submitFormSaga);
}

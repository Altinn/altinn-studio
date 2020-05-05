import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IRuntimeState } from 'src/types';
import { getCurrentTaskDataTypeId, get, put } from 'altinn-shared/utils';
import ProcessDispatcher from '../../../../shared/resources/process/processDispatcher';
import { IRuntimeStore, IUiConfig } from '../../../../types/global';
import { convertDataBindingToModel } from '../../../../utils/databindings';
import { dataElementUrl, getValidationUrl } from '../../../../utils/urlHelper';
import {
  canFormBeSaved,
  mapDataElementValidationToRedux,
  validateEmptyFields,
  validateFormComponents,
  validateFormData,
} from '../../../../utils/validation';
import { ILayoutState } from '../../layout/formLayoutReducer';
import FormValidationActions from '../../validation/validationActions';
import FormDataActions from '../formDataActions';
import {
  ISubmitDataAction,
} from './submitFormDataActions';
import * as FormDataActionTypes from '../formDataActionTypes';

const LayoutSelector: (store: IRuntimeStore) => ILayoutState = (store: IRuntimeStore) => store.formLayout;
const UIConfigSelector: (store: IRuntimeStore) => IUiConfig = (store: IRuntimeStore) => store.formLayout.uiConfig;

function* submitFormSaga({ url, apiMode }: ISubmitDataAction): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const model = convertDataBindingToModel(state.formData.formData, state.formDataModel.dataModel);
    let validations = validateFormData(state.formData, state.formDataModel.dataModel, state.formLayout.layout,
      state.language.language);
    const componentSpecificValidations =
      validateFormComponents(state.attachments.attachments, state.formLayout.layout, state.formData.formData,
        state.language.language, state.formLayout.uiConfig.hiddenFields);
    const emptyFieldsValidations =
      validateEmptyFields(state.formData.formData, state.formLayout.layout, state.language.language, state.formLayout.uiConfig.hiddenFields);

    validations = Object.assign(validations, componentSpecificValidations);
    if (apiMode === 'Complete') {
      validations = Object.assign(validations, emptyFieldsValidations);
    }

    if (canFormBeSaved(validations, apiMode)) {
      // updates the default data element
      const defaultDataElementGuid = getCurrentTaskDataTypeId(
        state.applicationMetadata.applicationMetadata,
        state.instanceData.instance,
        );
      try {
        yield call(put, dataElementUrl(defaultDataElementGuid), model);
      } catch (err) {
        if (err.response && err.response.status === 303) {
          yield call(FormDataActions.fetchFormData, dataElementUrl(err.response.data.id));
        } else {
          throw err;
        }
      }

      if (apiMode === 'Complete') {
        // run validations against the datamodel
        const instanceId = state.instanceData.instance.id;
        const validationResult: any = yield call(get, getValidationUrl(instanceId));
        // update validation state
        const layoutState: ILayoutState = yield select(LayoutSelector);
        const mappedValidations = mapDataElementValidationToRedux(validationResult, layoutState.layout, state.textResources.resources);
        FormValidationActions.updateValidations(mappedValidations);
        if (validationResult && validationResult.length > 0) {
          // we have validation errors, should not be able to submit
          return yield call(FormDataActions.submitFormDataRejected, null);
        } else {
          // data has no validation errors, we complete the current step
          yield call(ProcessDispatcher.completeProcess);
        }
      }
      yield call(FormDataActions.submitFormDataFulfilled);
    } else {
      FormValidationActions.updateValidations(validations);
      return yield call(FormDataActions.submitFormDataRejected, null);
    }
  } catch (err) {
    console.error(err);
    yield call(FormDataActions.submitFormDataRejected, err);
  }
}

function* autoSaveSaga(): SagaIterator {
  const uiConfig: IUiConfig = yield select(UIConfigSelector);
  if (uiConfig.autoSave !== false) {
    // undefined should default to auto save
    yield call(FormDataActions.submitFormData, null);
  }
}

export function* watchSubmitFormSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.SUBMIT_FORM_DATA, submitFormSaga);
}

export function* watchAutoSaveSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.UPDATE_FORM_DATA_FULFILLED, autoSaveSaga);
}

import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { getCurrentTaskDataElementId, get, put } from 'altinn-shared/utils';
import { IRuntimeState, IRuntimeStore, IUiConfig } from 'src/types';
import ProcessDispatcher from '../../../../shared/resources/process/processDispatcher';
import { convertDataBindingToModel, filterOutInvalidData } from '../../../../utils/databindings';
import { dataElementUrl, getValidationUrl } from '../../../../utils/urlHelper';
import { canFormBeSaved,
  createValidator,
  getNumberOfComponentsWithErrors,
  getNumberOfComponentsWithWarnings,
  mapDataElementValidationToRedux,
  mergeValidationObjects,
  validateEmptyFields,
  validateFormComponents,
  validateFormData } from '../../../../utils/validation';
import { ILayoutState } from '../../layout/formLayoutReducer';
import FormValidationActions from '../../validation/validationActions';
import FormDataActions from '../formDataActions';
import { ISubmitDataAction } from './submitFormDataActions';
import * as FormDataActionTypes from '../formDataActionTypes';
import { getDataTaskDataTypeId } from '../../../../utils/appMetadata';

const LayoutSelector: (store: IRuntimeStore) => ILayoutState = (store: IRuntimeStore) => store.formLayout;
const UIConfigSelector: (store: IRuntimeStore) => IUiConfig = (store: IRuntimeStore) => store.formLayout.uiConfig;

// eslint-disable-next-line consistent-return
function* submitFormSaga({ apiMode, stopWithWarnings }: ISubmitDataAction): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const currentDataTaskDataTypeId = getDataTaskDataTypeId(
      state.instanceData.instance.process.currentTask.elementId,
      state.applicationMetadata.applicationMetadata.dataTypes,
    );
    const schema = state.formDataModel.schemas[currentDataTaskDataTypeId];
    const validator = createValidator(schema);
    const model = convertDataBindingToModel(state.formData.formData);
    const validationResult = validateFormData(model, state.formLayout.layouts, validator, state.language.language);
    let validations = validationResult.validations;
    const componentSpecificValidations =
      validateFormComponents(state.attachments.attachments, state.formLayout.layouts, state.formData.formData,
        state.language.language, state.formLayout.uiConfig.hiddenFields);
    const emptyFieldsValidations = validateEmptyFields(
      state.formData.formData,
      state.formLayout.layouts,
      state.language.language,
      state.formLayout.uiConfig.hiddenFields,
      state.formLayout.uiConfig.repeatingGroups,
    );

    validations = mergeValidationObjects(validations, componentSpecificValidations);

    if (apiMode === 'Complete') {
      validations = mergeValidationObjects(validations, emptyFieldsValidations);
    }
    validationResult.validations = validations;
    if (canFormBeSaved(validationResult, apiMode)) {
      // updates the default data element
      const defaultDataElementGuid = getCurrentTaskDataElementId(
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
        const serverValidation: any = yield call(get, getValidationUrl(instanceId));
        // update validation state
        const layoutState: ILayoutState = yield select(LayoutSelector);
        const mappedValidations =
          mapDataElementValidationToRedux(serverValidation, layoutState.layouts, state.textResources.resources);
        FormValidationActions.updateValidations(mappedValidations);
        const hasErrors = getNumberOfComponentsWithErrors(mappedValidations) > 0;
        const hasWarnings = getNumberOfComponentsWithWarnings(mappedValidations) > 0;
        if (hasErrors || (stopWithWarnings && hasWarnings)) {
          // we have validation errors or warnings that should be shown, do not submit
          return yield call(FormDataActions.submitFormDataRejected, null);
        }
        // data has no validation errors, we complete the current step
        yield call(ProcessDispatcher.completeProcess);
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

// eslint-disable-next-line consistent-return
function* saveFormDataSaga(): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    // updates the default data element
    const defaultDataElementGuid = getCurrentTaskDataElementId(
      state.applicationMetadata.applicationMetadata,
      state.instanceData.instance,
    );

    const model = convertDataBindingToModel(
      filterOutInvalidData(state.formData.formData, state.formValidations.invalidDataTypes || []),
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

    if (state.formValidations.currentSingleFieldValidation) {
      yield call(FormValidationActions.runSingleFieldValidation);
    }

    yield call(FormDataActions.submitFormDataFulfilled);
  } catch (err) {
    console.error(err);
    yield call(FormDataActions.submitFormDataRejected, err);
  }
}

function* autoSaveSaga(): SagaIterator {
  const uiConfig: IUiConfig = yield select(UIConfigSelector);
  if (uiConfig.autoSave !== false) {
    // undefined should default to auto save
    yield call(FormDataActions.saveFormData);
  }
}

export function* watchSubmitFormSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.SUBMIT_FORM_DATA, submitFormSaga);
}

export function* watchSaveFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.SAVE_FORM_DATA, saveFormDataSaga);
}

export function* watchAutoSaveSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.UPDATE_FORM_DATA_FULFILLED, autoSaveSaga);
}

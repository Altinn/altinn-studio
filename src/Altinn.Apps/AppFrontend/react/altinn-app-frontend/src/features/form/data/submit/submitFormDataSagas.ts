/* eslint-disable max-len */
import { SagaIterator } from 'redux-saga';
import { call, put as sagaPut, select, takeLatest } from 'redux-saga/effects';
import { get, put } from 'altinn-shared/utils';
import { IRuntimeState, IRuntimeStore, IUiConfig, Severity } from 'src/types';
import { isIE } from 'react-device-detect';
import { PayloadAction } from '@reduxjs/toolkit';
import { post } from 'src/utils/networking';
import ProcessDispatcher from '../../../../shared/resources/process/processDispatcher';
import { convertDataBindingToModel, convertModelToDataBinding, filterOutInvalidData } from '../../../../utils/databindings';
import { dataElementUrl, getStatelessFormDataUrl, getValidationUrl } from '../../../../utils/urlHelper2';
import { canFormBeSaved,
  hasValidationsOfSeverity,
  getValidator,
  mapDataElementValidationToRedux,
  mergeValidationObjects,
  validateEmptyFields,
  validateFormComponents,
  validateFormData } from '../../../../utils/validation';
import { FormLayoutActions, ILayoutState } from '../../layout/formLayoutSlice';
import { runSingleFieldValidation, updateValidations } from '../../validation/validationSlice';
import FormDataActions from '../formDataActions';
import FormDynamicsActions from '../../dynamics/formDynamicsActions';
import { ISubmitDataAction } from '../formDataTypes';
import { getCurrentDataTypeForApplication, getCurrentTaskDataElementId, getDataTaskDataTypeId, isStatelessApp } from '../../../../utils/appMetadata';

const LayoutSelector: (store: IRuntimeStore) => ILayoutState = (store: IRuntimeStore) => store.formLayout;
const UIConfigSelector: (store: IRuntimeStore) => IUiConfig = (store: IRuntimeStore) => store.formLayout.uiConfig;

// eslint-disable-next-line consistent-return
function* submitFormSaga({ payload: { apiMode, stopWithWarnings } }: PayloadAction<ISubmitDataAction>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const currentDataTaskDataTypeId = getDataTaskDataTypeId(
      state.instanceData.instance.process.currentTask.elementId,
      state.applicationMetadata.applicationMetadata.dataTypes,
    );

    // Run client validations
    const validator = getValidator(currentDataTaskDataTypeId, state.formDataModel.schemas);
    const model = convertDataBindingToModel(state.formData.formData);
    const layoutOrder: string[] = state.formLayout.uiConfig.layoutOrder;
    const validationResult = validateFormData(
      model, state.formLayout.layouts, layoutOrder,
      validator, state.language.language, state.textResources.resources,
    );
    let validations = validationResult.validations;
    const componentSpecificValidations =
      validateFormComponents(state.attachments.attachments, state.formLayout.layouts, layoutOrder, state.formData.formData,
        state.language.language, state.formLayout.uiConfig.hiddenFields);
    const emptyFieldsValidations = validateEmptyFields(
      state.formData.formData,
      state.formLayout.layouts,
      layoutOrder,
      state.language.language,
      state.formLayout.uiConfig.hiddenFields,
      state.formLayout.uiConfig.repeatingGroups,
    );

    validations = mergeValidationObjects(validations, componentSpecificValidations);

    if (apiMode === 'Complete') {
      validations = mergeValidationObjects(validations, emptyFieldsValidations);
    }
    validationResult.validations = validations;
    if (!canFormBeSaved(validationResult, apiMode)) {
      yield sagaPut(updateValidations({ validations }));
      return yield sagaPut(FormDataActions.submitFormDataRejected({ error: null }));
    }

    yield call(putFormData, state, model);
    if (apiMode === 'Complete') {
      yield call(submitComplete, state, stopWithWarnings);
    }
    yield sagaPut(FormDataActions.submitFormDataFulfilled());
  } catch (error) {
    console.error(error);
    yield sagaPut(FormDataActions.submitFormDataRejected({ error }));
  }
}

function* submitComplete(state: IRuntimeState, stopWithWarnings: boolean) {
  // run validations against the datamodel
  const instanceId = state.instanceData.instance.id;
  const serverValidation: any = yield call(get, getValidationUrl(instanceId));
  // update validation state
  const layoutState: ILayoutState = yield select(LayoutSelector);
  const mappedValidations =
    mapDataElementValidationToRedux(serverValidation, layoutState.layouts, state.textResources.resources);
  yield sagaPut(updateValidations({ validations: mappedValidations }));
  const hasErrors = hasValidationsOfSeverity(mappedValidations, Severity.Error);
  const hasWarnings = hasValidationsOfSeverity(mappedValidations, Severity.Warning);
  if (hasErrors || (stopWithWarnings && hasWarnings)) {
    // we have validation errors or warnings that should be shown, do not submit
    return yield sagaPut(FormDataActions.submitFormDataRejected({ error: null }));
  }

  if (layoutState.uiConfig.currentViewCacheKey) {
    // Reset cache for current page when ending process task
    localStorage.removeItem(layoutState.uiConfig.currentViewCacheKey);
    yield sagaPut(FormLayoutActions.setCurrentViewCacheKey({ key: null }));
  }

  // data has no validation errors, we complete the current step
  return yield call(ProcessDispatcher.completeProcess);
}

export function* putFormData(state: IRuntimeState, model: any) {
  // updates the default data element
  const defaultDataElementGuid = getCurrentTaskDataElementId(
    state.applicationMetadata.applicationMetadata,
    state.instanceData.instance,
  );
  try {
    yield call(put, dataElementUrl(defaultDataElementGuid), model);
  } catch (error) {
    if (isIE) {
      // 303 is treated as en error in IE - we try to fetch.
      yield sagaPut(FormDataActions.fetchFormData({ url: dataElementUrl(defaultDataElementGuid) }));
    } else if (error.response && error.response.status === 303) {
      // 303 means that data has been changed by calculation on server. Try to update from response.
      const calculationUpdateHandled = yield call(handleCalculationUpdate, error.response.data?.changedFields);
      if (!calculationUpdateHandled) {
        // No changedFields property returned, try to fetch
        yield sagaPut(FormDataActions.fetchFormData({ url: dataElementUrl(defaultDataElementGuid) }));
      } else {
        yield sagaPut(FormLayoutActions.initRepeatingGroups());
      }
    } else {
      throw error;
    }
  }
}

function* handleCalculationUpdate(changedFields) {
  if (!changedFields) {
    return false;
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const fieldKey of Object.keys(changedFields)) {
    yield sagaPut(FormDataActions.updateFormData({
      data: changedFields[fieldKey]?.toString(),
      field: fieldKey,
      skipValidation: true,
      skipAutoSave: true,
    }));
  }

  return true;
}

// eslint-disable-next-line consistent-return
export function* saveFormDataSaga(): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    // updates the default data element
    const application = state.applicationMetadata.applicationMetadata;
    const model = convertDataBindingToModel(
      filterOutInvalidData(state.formData.formData, state.formValidations.invalidDataTypes || []),
    );

    if (isStatelessApp(application)) {
      yield call(saveStatelessData, state, model);
    } else {
      // app with instance
      yield call(putFormData, state, model);
    }

    if (state.formValidations.currentSingleFieldValidation?.dataModelBinding) {
      yield sagaPut(runSingleFieldValidation());
    }

    yield sagaPut(FormDataActions.submitFormDataFulfilled());
  } catch (error) {
    console.error(error);
    yield sagaPut(FormDataActions.submitFormDataRejected({ error }));
  }
}

export function* saveStatelessData(state: IRuntimeState, model: any) {
  const selectedPartyId = state.party.selectedParty.partyId;
  const currentDataType = getCurrentDataTypeForApplication(
    state.applicationMetadata.applicationMetadata,
    state.instanceData.instance,
    state.formLayout.layoutsets,
  );
  const response = yield call(post, getStatelessFormDataUrl(currentDataType), { headers: { party: `partyid:${selectedPartyId}` } }, model);
  const formData = convertModelToDataBinding(response?.data);
  yield sagaPut(FormDataActions.fetchFormDataFulfilled({ formData }));
  yield call(FormDynamicsActions.checkIfConditionalRulesShouldRun);
}

function* autoSaveSaga(): SagaIterator {
  const uiConfig: IUiConfig = yield select(UIConfigSelector);
  if (uiConfig.autoSave !== false) {
    // undefined should default to auto save
    yield sagaPut(FormDataActions.saveFormData());
  }
}

export function* watchSubmitFormSaga(): SagaIterator {
  yield takeLatest(FormDataActions.submitFormData, submitFormSaga);
}

export function* watchSaveFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActions.saveFormData, saveFormDataSaga);
}

export function* watchAutoSaveSaga(): SagaIterator {
  yield takeLatest(FormDataActions.updateFormDataFulfilled, autoSaveSaga);
}

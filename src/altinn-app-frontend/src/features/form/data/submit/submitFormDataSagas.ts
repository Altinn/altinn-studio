import type { SagaIterator } from 'redux-saga';
import { call, put as sagaPut, select, takeLatest } from 'redux-saga/effects';
import { get, put } from 'altinn-shared/utils';
import type { IRuntimeState, IRuntimeStore, IUiConfig } from 'src/types';
import { Severity } from 'src/types';
import type { PayloadAction } from '@reduxjs/toolkit';
import { post } from 'src/utils/networking';
import {
  convertDataBindingToModel,
  convertModelToDataBinding,
  filterOutInvalidData,
} from '../../../../utils/databindings';
import {
  dataElementUrl,
  getStatelessFormDataUrl,
  getValidationUrl,
} from '../../../../utils/appUrlHelper';
import {
  canFormBeSaved,
  hasValidationsOfSeverity,
  getValidator,
  mapDataElementValidationToRedux,
  mergeValidationObjects,
  validateEmptyFields,
  validateFormComponents,
  validateFormData,
} from '../../../../utils/validation';
import type { ILayoutState } from '../../layout/formLayoutSlice';
import { FormLayoutActions } from '../../layout/formLayoutSlice';
import { ValidationActions } from '../../validation/validationSlice';
import { FormDataActions } from '../formDataSlice';
import { FormDynamicsActions } from '../../dynamics/formDynamicsSlice';
import type {
  ISubmitDataAction,
  IUpdateFormDataFulfilled,
} from '../formDataTypes';
import {
  getCurrentDataTypeForApplication,
  getCurrentTaskDataElementId,
  getDataTaskDataTypeId,
  isStatelessApp,
} from '../../../../utils/appMetadata';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { ProcessActions } from 'src/shared/resources/process/processSlice';

const LayoutSelector: (store: IRuntimeStore) => ILayoutState = (
  store: IRuntimeStore,
) => store.formLayout;
const UIConfigSelector: (store: IRuntimeStore) => IUiConfig = (
  store: IRuntimeStore,
) => store.formLayout.uiConfig;
export const allowAnonymousSelector = makeGetAllowAnonymousSelector();

function* submitFormSaga({
  payload: { apiMode, stopWithWarnings },
}: PayloadAction<ISubmitDataAction>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const currentDataTaskDataTypeId = getDataTaskDataTypeId(
      state.instanceData.instance.process.currentTask.elementId,
      state.applicationMetadata.applicationMetadata.dataTypes,
    );

    // Run client validations
    const validator = getValidator(
      currentDataTaskDataTypeId,
      state.formDataModel.schemas,
    );
    const model = convertDataBindingToModel(state.formData.formData);
    const layoutOrder: string[] = state.formLayout.uiConfig.layoutOrder;
    const validationResult = validateFormData(
      model,
      state.formLayout.layouts,
      layoutOrder,
      validator,
      state.language.language,
      state.textResources.resources,
    );
    let validations = validationResult.validations;
    const componentSpecificValidations = validateFormComponents(
      state.attachments.attachments,
      state.formLayout.layouts,
      layoutOrder,
      state.formData.formData,
      state.language.language,
      state.formLayout.uiConfig.hiddenFields,
      state.formLayout.uiConfig.repeatingGroups,
    );
    const emptyFieldsValidations = validateEmptyFields(
      state.formData.formData,
      state.formLayout.layouts,
      layoutOrder,
      state.language.language,
      state.formLayout.uiConfig.hiddenFields,
      state.formLayout.uiConfig.repeatingGroups,
      state.textResources.resources,
    );

    validations = mergeValidationObjects(
      validations,
      componentSpecificValidations,
    );

    if (apiMode === 'Complete') {
      validations = mergeValidationObjects(validations, emptyFieldsValidations);
    }
    validationResult.validations = validations;
    if (!canFormBeSaved(validationResult, apiMode)) {
      yield sagaPut(ValidationActions.updateValidations({ validations }));
      return yield sagaPut(FormDataActions.submitRejected({ error: null }));
    }

    yield call(putFormData, state, model);
    if (apiMode === 'Complete') {
      yield call(submitComplete, state, stopWithWarnings);
    }
    yield sagaPut(FormDataActions.submitFulfilled());
  } catch (error) {
    console.error(error);
    yield sagaPut(FormDataActions.submitRejected({ error }));
  }
}

function* submitComplete(state: IRuntimeState, stopWithWarnings: boolean) {
  // run validations against the datamodel
  const instanceId = state.instanceData.instance.id;
  const serverValidation: any = yield call(get, getValidationUrl(instanceId));
  // update validation state
  const layoutState: ILayoutState = yield select(LayoutSelector);
  const mappedValidations = mapDataElementValidationToRedux(
    serverValidation,
    layoutState.layouts,
    state.textResources.resources,
  );
  yield sagaPut(
    ValidationActions.updateValidations({ validations: mappedValidations }),
  );
  const hasErrors = hasValidationsOfSeverity(mappedValidations, Severity.Error);
  const hasWarnings = hasValidationsOfSeverity(
    mappedValidations,
    Severity.Warning,
  );
  if (hasErrors || (stopWithWarnings && hasWarnings)) {
    // we have validation errors or warnings that should be shown, do not submit
    return yield sagaPut(FormDataActions.submitRejected({ error: null }));
  }

  if (layoutState.uiConfig.currentViewCacheKey) {
    // Reset cache for current page when ending process task
    localStorage.removeItem(layoutState.uiConfig.currentViewCacheKey);
    yield sagaPut(FormLayoutActions.setCurrentViewCacheKey({ key: null }));
  }

  // data has no validation errors, we complete the current step
  return yield sagaPut(ProcessActions.complete());
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
    if (error.response && error.response.status === 303) {
      // 303 means that data has been changed by calculation on server. Try to update from response.
      const calculationUpdateHandled = yield call(
        handleCalculationUpdate,
        error.response.data?.changedFields,
      );
      if (!calculationUpdateHandled) {
        // No changedFields property returned, try to fetch
        yield sagaPut(
          FormDataActions.fetch({
            url: dataElementUrl(defaultDataElementGuid),
          }),
        );
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
  for (const fieldKey of Object.keys(changedFields)) {
    yield sagaPut(
      FormDataActions.update({
        data: changedFields[fieldKey]?.toString(),
        field: fieldKey,
        skipValidation: true,
        skipAutoSave: true,
      }),
    );
  }

  return true;
}

export function* saveFormDataSaga(): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    // updates the default data element
    const application = state.applicationMetadata.applicationMetadata;
    const model = convertDataBindingToModel(
      filterOutInvalidData({
        data: state.formData.formData,
        invalidKeys: state.formValidations.invalidDataTypes,
      }),
    );

    if (isStatelessApp(application)) {
      yield call(saveStatelessData, state, model);
    } else {
      // app with instance
      yield call(putFormData, state, model);
    }

    if (state.formValidations.currentSingleFieldValidation?.dataModelBinding) {
      yield sagaPut(ValidationActions.runSingleFieldValidation());
    }

    yield sagaPut(FormDataActions.submitFulfilled());
  } catch (error) {
    console.error(error);
    yield sagaPut(FormDataActions.submitRejected({ error }));
  }
}

export function* saveStatelessData(state: IRuntimeState, model: any) {
  const allowAnonymous = yield select(allowAnonymousSelector);
  let options;
  if (!allowAnonymous) {
    const selectedPartyId = state.party.selectedParty.partyId;
    options = {
      headers: {
        party: `partyid:${selectedPartyId}`,
      },
    };
  }

  const currentDataType = getCurrentDataTypeForApplication({
    application: state.applicationMetadata.applicationMetadata,
    instance: state.instanceData.instance,
    layoutSets: state.formLayout.layoutsets,
  });
  const response = yield call(
    post,
    getStatelessFormDataUrl(currentDataType, allowAnonymous),
    options,
    model,
  );
  const formData = convertModelToDataBinding(response?.data);
  yield sagaPut(FormDataActions.fetchFulfilled({ formData }));
  yield sagaPut(FormDynamicsActions.checkIfConditionalRulesShouldRun({}));
}

function* autoSaveSaga({
  payload: { skipAutoSave },
}: PayloadAction<IUpdateFormDataFulfilled>): SagaIterator {
  if (skipAutoSave) {
    return;
  }

  const uiConfig: IUiConfig = yield select(UIConfigSelector);
  if (uiConfig.autoSave !== false) {
    // undefined should default to auto save
    yield sagaPut(FormDataActions.save());
  }
}

export function* watchSubmitFormSaga(): SagaIterator {
  yield takeLatest(FormDataActions.submit, submitFormSaga);
}

export function* watchSaveFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActions.save, saveFormDataSaga);
}

export function* watchAutoSaveSaga(): SagaIterator {
  yield takeLatest(FormDataActions.updateFulfilled, autoSaveSaga);
}

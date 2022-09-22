import { all, call, put as sagaPut, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { Severity } from 'src/types';
import {
  getCurrentDataTypeForApplication,
  getCurrentTaskDataElementId,
  isStatelessApp,
} from 'src/utils/appMetadata';
import {
  dataElementUrl,
  getStatelessFormDataUrl,
  getValidationUrl,
} from 'src/utils/appUrlHelper';
import {
  convertDataBindingToModel,
  convertModelToDataBinding,
  filterOutInvalidData,
} from 'src/utils/databindings';
import { post } from 'src/utils/networking';
import {
  canFormBeSaved,
  hasValidationsOfSeverity,
  mapDataElementValidationToRedux,
  mergeValidationObjects,
  runClientSideValidation,
} from 'src/utils/validation';
import type {
  ISubmitDataAction,
  IUpdateFormDataFulfilled,
} from 'src/features/form/data/formDataTypes';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
import type { IRuntimeState, IRuntimeStore, IUiConfig } from 'src/types';

import { get, put } from 'altinn-shared/utils';

const LayoutSelector: (store: IRuntimeStore) => ILayoutState = (
  store: IRuntimeStore,
) => store.formLayout;
const UIConfigSelector: (store: IRuntimeStore) => IUiConfig = (
  store: IRuntimeStore,
) => store.formLayout.uiConfig;

export function* submitFormSaga({
  payload: { apiMode, stopWithWarnings },
}: PayloadAction<ISubmitDataAction>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const {
      model,
      validationResult,
      componentSpecificValidations,
      emptyFieldsValidations,
    } = runClientSideValidation(state);

    validationResult.validations = mergeValidationObjects(
      validationResult.validations,
      componentSpecificValidations,
      apiMode === 'Complete' ? emptyFieldsValidations : null,
    );
    const { validations } = validationResult;
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
    state.formLayout.layoutsets,
  );
  try {
    yield call(put, dataElementUrl(defaultDataElementGuid), model);
  } catch (error) {
    if (error.response && error.response.status === 303) {
      // 303 means that data has been changed by calculation on server. Try to update from response.
      if (error.response.data?.changedFields) {
        yield call(handleCalculationUpdate, error.response.data?.changedFields);
        yield sagaPut(FormLayoutActions.initRepeatingGroups());
      } else {
        // No changedFields property returned, try to fetch
        yield sagaPut(
          FormDataActions.fetch({
            url: dataElementUrl(defaultDataElementGuid),
          }),
        );
      }
    } else {
      throw error;
    }
  }
}

function* handleCalculationUpdate(changedFields) {
  if (!changedFields) {
    return;
  }

  yield all(
    Object.keys(changedFields).map((fieldKey) =>
      sagaPut(
        FormDataActions.update({
          data: changedFields[fieldKey]?.toString(),
          field: fieldKey,
          skipValidation: true,
          skipAutoSave: true,
        }),
      ),
    ),
  );
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
  const allowAnonymous = yield select(makeGetAllowAnonymousSelector());
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

export function* autoSaveSaga({
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

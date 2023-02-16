import { all, call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { Severity } from 'src/types';
import { getCurrentDataTypeForApplication, getCurrentTaskDataElementId, isStatelessApp } from 'src/utils/appMetadata';
import { convertDataBindingToModel, convertModelToDataBinding, filterOutInvalidData } from 'src/utils/databindings';
import { httpPost } from 'src/utils/network/networking';
import { httpGet, httpPut } from 'src/utils/network/sharedNetworking';
import { waitFor } from 'src/utils/sagas';
import { dataElementUrl, getStatelessFormDataUrl, getValidationUrl } from 'src/utils/urls/appUrlHelper';
import { runClientSideValidation } from 'src/utils/validation/runClientSideValidation';
import {
  canFormBeSaved,
  hasValidationsOfSeverity,
  mapDataElementValidationToRedux,
  mergeValidationObjects,
} from 'src/utils/validation/validation';
import type { IFormData } from 'src/features/form/data';
import type { ISubmitDataAction, IUpdateFormDataFulfilled } from 'src/features/form/data/formDataTypes';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
import type { IRuntimeState, IRuntimeStore, IUiConfig, IValidationIssue } from 'src/types';

const LayoutSelector: (store: IRuntimeStore) => ILayoutState = (store: IRuntimeStore) => store.formLayout;
const UIConfigSelector: (store: IRuntimeStore) => IUiConfig = (store: IRuntimeStore) => store.formLayout.uiConfig;

export function* submitFormSaga({
  payload: { apiMode, stopWithWarnings },
}: PayloadAction<ISubmitDataAction>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const { validationResult, componentSpecificValidations, emptyFieldsValidations } = runClientSideValidation(state);

    validationResult.validations = mergeValidationObjects(
      validationResult.validations,
      componentSpecificValidations,
      apiMode === 'Complete' ? emptyFieldsValidations : null,
    );
    const { validations } = validationResult;
    if (!canFormBeSaved(validationResult, apiMode)) {
      yield put(ValidationActions.updateValidations({ validations }));
      return yield put(FormDataActions.submitRejected({ error: null }));
    }

    yield call(putFormData, {});
    if (apiMode === 'Complete') {
      yield call(submitComplete, state, stopWithWarnings);
    }
    yield put(FormDataActions.submitFulfilled());
  } catch (error) {
    console.error(error);
    yield put(FormDataActions.submitRejected({ error }));
  }
}

function* submitComplete(state: IRuntimeState, stopWithWarnings: boolean | undefined) {
  // run validations against the datamodel
  const instanceId = state.instanceData.instance?.id;
  const serverValidation: IValidationIssue[] | undefined = instanceId
    ? yield call(httpGet, getValidationUrl(instanceId))
    : undefined;

  // update validation state
  const layoutState: ILayoutState = yield select(LayoutSelector);
  const mappedValidations = mapDataElementValidationToRedux(
    serverValidation,
    layoutState.layouts,
    state.textResources.resources,
  );
  yield put(ValidationActions.updateValidations({ validations: mappedValidations }));
  const hasErrors = hasValidationsOfSeverity(mappedValidations, Severity.Error);
  const hasWarnings = hasValidationsOfSeverity(mappedValidations, Severity.Warning);
  if (hasErrors || (stopWithWarnings && hasWarnings)) {
    // we have validation errors or warnings that should be shown, do not submit
    return yield put(FormDataActions.submitRejected({ error: null }));
  }

  if (layoutState.uiConfig.currentViewCacheKey) {
    // Reset cache for current page when ending process task
    localStorage.removeItem(layoutState.uiConfig.currentViewCacheKey);
    yield put(FormLayoutActions.setCurrentViewCacheKey({ key: undefined }));
  }

  // data has no validation errors, we complete the current step
  return yield put(ProcessActions.complete());
}

function createFormDataRequest(
  state: IRuntimeState,
  model: any,
  field: string | undefined,
  componentId: string | undefined,
): { data: any; options?: AxiosRequestConfig } {
  if (state.applicationMetadata.applicationMetadata?.features?.multiPartSave) {
    const previous = diffModels(state.formData.formData, state.formData.lastSavedFormData);
    const data = new FormData();
    data.append('dataModel', JSON.stringify(model));
    data.append('previousValues', JSON.stringify(previous));
    return { data };
  }

  const options: AxiosRequestConfig = {
    headers: {
      'X-DataField': (field && encodeURIComponent(field)) || 'undefined',
      'X-ComponentId': (componentId && encodeURIComponent(componentId)) || 'undefined',
    },
  };

  return { data: model, options };
}

function diffModels(current: IFormData, prev: IFormData) {
  const changes: { [key: string]: string | null } = {};
  for (const key of Object.keys(current)) {
    if (current[key] !== prev[key]) {
      changes[key] = prev[key];
      if (prev[key] === undefined) {
        changes[key] = null;
      }
    }
  }
  for (const key of Object.keys(prev)) {
    if (!(key in current)) {
      changes[key] = prev[key];
    }
  }

  return changes;
}

function* waitForSaving() {
  // We should only run one save request at a time. This function waits until we can perform
  // a saving operations, and reserves a spot.
  yield waitFor((state) => !state.formData.saving);
  yield put(FormDataActions.savingStarted());
}

export function* putFormData({ field, componentId }: SaveDataParams) {
  const defaultDataElementGuid: string | undefined = yield select((state) =>
    getCurrentTaskDataElementId(
      state.applicationMetadata.applicationMetadata,
      state.instanceData.instance,
      state.formLayout.layoutsets,
    ),
  );
  if (!defaultDataElementGuid) {
    return;
  }

  yield call(waitForSaving);
  const state: IRuntimeState = yield select();
  const model = getModelToSave(state);

  const url = dataElementUrl(defaultDataElementGuid);
  let lastSavedModel = state.formData.formData;
  try {
    const { data, options } = createFormDataRequest(state, model, field, componentId);
    const responseData = yield call(httpPut, url, data, options);
    lastSavedModel = yield call(handleChangedFields, responseData?.changedFields, state.formData.formData);
  } catch (error) {
    if (error.response && error.response.status === 303) {
      // 303 means that data has been changed by calculation on server. Try to update from response.
      // Newer backends might not reply back with this special response code when there are changes, they
      // will just respond with the 'changedFields' property instead (see code handling this above).
      if (error.response.data?.changedFields) {
        lastSavedModel = yield call(handleChangedFields, error.response.data?.changedFields, state.formData.formData);
      } else {
        // No changedFields property returned, try to fetch
        yield put(FormDataActions.fetch({ url }));
      }
    } else {
      throw error;
    }
  }

  yield put(FormDataActions.savingEnded({ model: lastSavedModel }));
}

/**
 * When asked to save the data model, the server will execute ProcessDataWrite(), which may mutate the data model and
 * add new data/remove data from it. If that happens, we need to inject those changes back into our data model.
 */
function* handleChangedFields(changedFields: IFormData | undefined, lastSavedFormData: IFormData) {
  if (!changedFields) {
    return lastSavedFormData;
  }

  yield all(
    Object.keys(changedFields).map((field) => {
      // Simulating the update on lastSavedFormData as well, because we need to pretend these changes were here all
      // along in order to send the proper list of changed fields in the next save request. We can't simply read the
      // current formData when the save is done (and use that for the lastSavedFormData state) because that may have
      // changed since we started saving (another request may be in the queue to save the next piece of data).
      const data = changedFields[field]?.toString();
      if (data === undefined || data === null || data === '') {
        delete lastSavedFormData[field];
      } else {
        lastSavedFormData[field] = data;
      }

      return put(
        FormDataActions.update({
          data,
          field,
          skipValidation: true,
          skipAutoSave: true,
        }),
      );
    }),
  );

  yield put(FormLayoutActions.initRepeatingGroups());

  return lastSavedFormData;
}

function getModelToSave(state: IRuntimeState) {
  return convertDataBindingToModel(
    filterOutInvalidData({
      data: state.formData.formData,
      invalidKeys: state.formValidations.invalidDataTypes,
    }),
  );
}

export function* saveFormDataSaga({
  payload: { field, componentId, singleFieldValidation },
}: PayloadAction<IUpdateFormDataFulfilled>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    // updates the default data element
    const application = state.applicationMetadata.applicationMetadata;

    if (isStatelessApp(application)) {
      yield call(saveStatelessData, { field, componentId });
    } else {
      // app with instance
      yield call(putFormData, { field, componentId });
    }

    if (singleFieldValidation && componentId) {
      yield put(
        ValidationActions.runSingleFieldValidation({
          componentId,
          dataModelBinding: singleFieldValidation.dataModelBinding,
          layoutId: singleFieldValidation.layoutId,
        }),
      );
    }

    yield put(FormDataActions.submitFulfilled());
  } catch (error) {
    console.error(error);
    yield put(FormDataActions.submitRejected({ error }));
  }
}

interface SaveDataParams {
  field?: string;
  componentId?: string;
}

export function* saveStatelessData({ field, componentId }: SaveDataParams) {
  yield call(waitForSaving);

  const state: IRuntimeState = yield select();
  const model = getModelToSave(state);
  const allowAnonymous = yield select(makeGetAllowAnonymousSelector());
  let headers: AxiosRequestConfig['headers'] = {
    'X-DataField': (field && encodeURIComponent(field)) || 'undefined',
    'X-ComponentId': (componentId && encodeURIComponent(componentId)) || 'undefined',
  };
  if (!allowAnonymous) {
    const selectedPartyId = state.party.selectedParty?.partyId;
    headers = {
      ...headers,
      party: `partyid:${selectedPartyId}`,
    };
  }

  const currentDataType = getCurrentDataTypeForApplication({
    application: state.applicationMetadata.applicationMetadata,
    instance: state.instanceData.instance,
    layoutSets: state.formLayout.layoutsets,
  });
  if (currentDataType) {
    const response = yield call(httpPost, getStatelessFormDataUrl(currentDataType, allowAnonymous), { headers }, model);
    const formData = convertModelToDataBinding(response?.data);
    yield put(FormDataActions.fetchFulfilled({ formData }));
    yield put(FormDynamicsActions.checkIfConditionalRulesShouldRun({}));
  }

  yield put(FormDataActions.savingEnded({ model: state.formData.formData }));
}

export function* autoSaveSaga({
  payload: { skipAutoSave, field, componentId, singleFieldValidation },
}: PayloadAction<IUpdateFormDataFulfilled>): SagaIterator {
  if (skipAutoSave) {
    return;
  }

  const uiConfig: IUiConfig = yield select(UIConfigSelector);
  if (uiConfig.autoSave !== false) {
    // undefined should default to auto save
    yield put(FormDataActions.save({ field, componentId, singleFieldValidation }));
  }
}

import { all, call, cancelled, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { FormDynamicsActions } from 'src/features/dynamics/formDynamicsSlice';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { ProcessActions } from 'src/features/process/processSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
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
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IFormData } from 'src/features/formData';
import type { IUpdateFormData } from 'src/features/formData/formDataTypes';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';
import type { IRuntimeState, IRuntimeStore, IUiConfig, IValidationIssue } from 'src/types';

const LayoutSelector: (store: IRuntimeStore) => ILayoutState = (store: IRuntimeStore) => store.formLayout;
const getApplicationMetaData = (store: IRuntimeState) => store.applicationMetadata?.applicationMetadata;
const selectUiConfig = (state: IRuntimeState) => state.formLayout.uiConfig;

/**
 * Saga that submits the form data to the backend, and moves the process forward.
 * @see autoSaveSaga
 */
export function* submitFormSaga(): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const { validationResult, componentSpecificValidations, emptyFieldsValidations } = runClientSideValidation(state);

    validationResult.validations = mergeValidationObjects(
      validationResult.validations,
      componentSpecificValidations,
      emptyFieldsValidations,
    );
    const { validations } = validationResult;
    if (!canFormBeSaved(validationResult)) {
      yield put(ValidationActions.updateValidations({ validations }));
      return yield put(FormDataActions.submitRejected({ error: null }));
    }

    yield call(putFormData, {});
    yield call(submitComplete, state);
    yield put(FormDataActions.submitFulfilled());
  } catch (error) {
    console.error(error);
    yield put(FormDataActions.submitRejected({ error }));
  }
}

function* submitComplete(state: IRuntimeState) {
  // run validations against the datamodel
  const instanceId = state.instanceData.instance?.id;
  const serverValidation: IValidationIssue[] | undefined = instanceId
    ? yield call(httpGet, getValidationUrl(instanceId))
    : undefined;

  // update validation state
  const langTools = staticUseLanguageFromState(state);
  const layoutState: ILayoutState = yield select(LayoutSelector);
  const mappedValidations = mapDataElementValidationToRedux(serverValidation, layoutState.layouts, langTools);
  yield put(ValidationActions.updateValidations({ validations: mappedValidations }));
  const hasErrors = hasValidationsOfSeverity(mappedValidations, Severity.Error);
  if (hasErrors) {
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

/**
 * This is the saving logic that is used for both autosaving and when the form is
 * submitted at the end (moving the process forward).
 *
 * Strangely, this only performs the autosave logic for regular apps, but stateless apps have their own logic for this.
 * However, when the form is submitted at the end, this is used for both regular and stateless apps.
 *
 * @see submitFormSaga
 * @see autoSaveSaga
 * @see postStatelessData
 */
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
  const formDataCopy: IFormData = { ...state.formData.formData };

  const url = dataElementUrl(defaultDataElementGuid);
  let lastSavedModel = state.formData.formData;
  try {
    const { data, options } = createFormDataRequest(state, model, field, componentId);
    const responseData = yield call(httpPut, url, data, options);
    lastSavedModel = yield call(handleChangedFields, responseData?.changedFields, formDataCopy);
  } catch (error) {
    if (error.response && error.response.status === 303) {
      // 303 means that data has been changed by calculation on server. Try to update from response.
      // Newer backends might not reply back with this special response code when there are changes, they
      // will just respond with the 'changedFields' property instead (see code handling this above).
      if (error.response.data?.changedFields) {
        lastSavedModel = yield call(handleChangedFields, error.response.data?.changedFields, formDataCopy);
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
  if (!changedFields || Object.keys(changedFields).length === 0) {
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

  yield put(FormLayoutActions.initRepeatingGroups({ changedFields }));

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

/**
 * Saves the form data to the backend, called from the auto-save saga. This calls the methods that actually perform
 * the save operation, but this is NOT the saving logic that happens on _submit_ (when the form is submitted, and
 * the process moves forward).
 * @see autoSaveSaga
 * @see submitFormSaga
 */
export function* saveFormDataSaga({
  payload: { field, componentId, singleFieldValidation },
}: PayloadAction<IUpdateFormData>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    // updates the default data element
    const application = state.applicationMetadata.applicationMetadata;

    if (isStatelessApp(application)) {
      yield call(postStatelessData, { field, componentId });
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

/**
 * Innermost POST request that is called for stateless apps. This is only called during auto-save, and not when the
 * form is submitted.
 * @see saveFormDataSaga
 * @see autoSaveSaga
 */
export function* postStatelessData({ field, componentId }: SaveDataParams) {
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
    const abortController = new AbortController();
    try {
      const response = yield call(
        httpPost,
        getStatelessFormDataUrl(currentDataType, allowAnonymous),
        {
          headers,
          signal: abortController.signal,
        },
        model,
      );
      const formData = convertModelToDataBinding(response?.data);
      yield put(FormDataActions.fetchFulfilled({ formData }));
      yield put(FormDynamicsActions.checkIfConditionalRulesShouldRun({}));
    } finally {
      if (yield cancelled()) {
        // If the saga were cancelled (takeLatest), we would abort the HTTP request/promise
        // to ensure we do not update the redux-state with staled data.
        abortController.abort();
        console.warn('Request aborted due to saga cancellation');
      }
    }
  }

  yield put(FormDataActions.savingEnded({ model: state.formData.formData }));
}

/**
 * Auto-saves the form data when the user has made changes to the form. This is done very often.
 * @see submitFormSaga
 */
export function* autoSaveSaga({
  payload: { skipAutoSave, field, componentId, singleFieldValidation },
}: PayloadAction<IUpdateFormData>): SagaIterator {
  const uiConfig: IUiConfig = yield select(selectUiConfig);
  if (skipAutoSave || uiConfig.autoSaveBehavior === 'onChangePage') {
    return;
  }

  const applicationMetadata: IApplicationMetadata = yield select(getApplicationMetaData);

  if (isStatelessApp(applicationMetadata)) {
    yield put(FormDataActions.saveLatest({ field, componentId, singleFieldValidation }));
  } else {
    yield put(FormDataActions.saveEvery({ field, componentId, singleFieldValidation }));
  }
}

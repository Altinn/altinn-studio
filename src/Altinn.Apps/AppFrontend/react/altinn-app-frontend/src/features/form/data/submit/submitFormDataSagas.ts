/* eslint-disable max-len */
import { SagaIterator } from 'redux-saga';
import { call, put as sagaPut, select, takeLatest } from 'redux-saga/effects';
import { getCurrentTaskDataElementId, get, put } from 'altinn-shared/utils';
import { IRuntimeState, IRuntimeStore, IUiConfig } from 'src/types';
import { isIE } from 'react-device-detect';
import { PayloadAction } from '@reduxjs/toolkit';
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
import { FormLayoutActions, ILayoutState } from '../../layout/formLayoutSlice';
import FormValidationActions from '../../validation/validationActions';
import FormDataActions from '../formDataActions';
import { ISubmitDataAction } from '../formDataTypes';
import { getDataTaskDataTypeId } from '../../../../utils/appMetadata';

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
    const schema = state.formDataModel.schemas[currentDataTaskDataTypeId];
    const validator = createValidator(schema);
    const model = convertDataBindingToModel(state.formData.formData);
    const layoutOrder: string[] = state.formLayout.uiConfig.layoutOrder;
    const validationResult = validateFormData(model, state.formLayout.layouts, layoutOrder, validator, state.language.language);
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
    if (canFormBeSaved(validationResult, apiMode)) {
      // updates the default data element
      const defaultDataElementGuid = getCurrentTaskDataElementId(
        state.applicationMetadata.applicationMetadata,
        state.instanceData.instance,
      );
      try {
        yield call(put, dataElementUrl(defaultDataElementGuid), model);
      } catch (error) {
        if ((error.response && error.response.status === 303) || isIE) {
          if (error.response?.data?.changedFields) {
            const changedFields = error.response.data.changedFields;
            // eslint-disable-next-line no-restricted-syntax
            for (const fieldKey of Object.keys(changedFields)) {
              yield sagaPut(FormDataActions.updateFormData({
                data: changedFields[fieldKey],
                field: fieldKey,
                skipValidation: true,
              }));
            }
          } else {
            // 303 is treated as en error in IE - we try to fetch.
            yield sagaPut(FormDataActions.fetchFormData({ url: dataElementUrl(defaultDataElementGuid) }));
          }
        } else {
          throw error;
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
          return yield sagaPut(FormDataActions.submitFormDataRejected({ error: null }));
        }
        // data has no validation errors, we complete the current step
        yield call(ProcessDispatcher.completeProcess);

        if (layoutState.uiConfig.currentViewCacheKey) {
          // Reset cache for current page when ending process task
          localStorage.removeItem(layoutState.uiConfig.currentViewCacheKey);
          yield sagaPut(FormLayoutActions.setCurrentViewCacheKey({ key: null }));
        }
      }
      yield sagaPut(FormDataActions.submitFormDataFulfilled());
    } else {
      FormValidationActions.updateValidations(validations);
      return yield sagaPut(FormDataActions.submitFormDataRejected({ error: null }));
    }
  } catch (error) {
    console.error(error);
    yield sagaPut(FormDataActions.submitFormDataRejected({ error }));
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
    } catch (error) {
      if ((error.response && error.response.status === 303) || isIE) {
        if (error.response?.data?.changedFields) {
          const changedFields = error.response.data.changedFields;
          // eslint-disable-next-line no-restricted-syntax
          for (const fieldKey of Object.keys(changedFields)) {
            yield sagaPut(FormDataActions.updateFormData({
              data: changedFields[fieldKey],
              field: fieldKey,
              skipValidation: true,
            }));
          }
        } else {
          // 303 is treated as en error in IE - we try to fetch.
          yield sagaPut(FormDataActions.fetchFormData({ url: dataElementUrl(defaultDataElementGuid) }));
        }
      } else {
        throw error;
      }
    }

    if (state.formValidations.currentSingleFieldValidation) {
      yield call(FormValidationActions.runSingleFieldValidation);
    }

    yield sagaPut(FormDataActions.submitFormDataFulfilled());
  } catch (error) {
    console.error(error);
    yield sagaPut(FormDataActions.submitFormDataRejected({ error }));
  }
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

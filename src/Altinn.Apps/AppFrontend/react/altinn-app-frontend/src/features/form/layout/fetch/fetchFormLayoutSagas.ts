import { SagaIterator } from 'redux-saga';
import { call, all, take, select, takeEvery } from 'redux-saga/effects';
import { IAltinnWindow } from 'altinn-shared/types';
import { getLayoutSettingsUrl, getValidationUrl } from 'src/utils/urlHelper';
import { getDataTaskDataTypeId } from 'src/utils/appMetadata';
import { convertDataBindingToModel } from 'src/utils/databindings';
import { createValidator, validateFormData, validateFormComponents, validateEmptyFields, mapDataElementValidationToRedux, canFormBeSaved } from 'src/utils/validation';
import { AxiosRequestConfig } from 'axios';
import { get } from '../../../../utils/networking';
import Actions from '../formLayoutActions';
import { IFetchFormLayout } from './fetchFormLayoutActions';
import * as ActionTypes from '../formLayoutActionTypes';
import * as FormDataActionTypes from '../../data/formDataActionTypes';
import QueueActions from '../../../../shared/resources/queue/queueActions';
import { getRepeatingGroups } from '../../../../utils/formLayout';
import { ILayoutSettings, IRuntimeState } from '../../../../types';
import { IFormDataState } from '../../data/formDataReducer';
import { ILayouts } from '../index';
import { IUpdateCurrentView } from '../update/updateFormLayoutActions';
import FormValidationActions from '../../validation/validationActions';
import { ILayoutState } from '../formLayoutReducer';

const formDataSelector = (state: IRuntimeState) => state.formData;

function* fetchFormLayoutSaga({ url }: IFetchFormLayout): SagaIterator {
  try {
    const layoutResponse: any = yield call(get, url);
    const layouts: ILayouts = {};
    const navigationConfig: any = {};
    let autoSave: boolean;
    let firstLayoutKey: string;
    let repeatingGroups = {};
    const formDataState: IFormDataState = yield select(formDataSelector);

    if (layoutResponse.data) {
      layouts.FormLayout = layoutResponse.data.layout;
      firstLayoutKey = 'FormLayout';
      autoSave = layoutResponse.data.autoSave;
      repeatingGroups = getRepeatingGroups(layouts[firstLayoutKey],
        formDataState.formData);
    } else {
      const orderedLayoutKeys = Object.keys(layoutResponse).sort();
      firstLayoutKey = orderedLayoutKeys[0];

      orderedLayoutKeys.forEach((key) => {
        layouts[key] = layoutResponse[key].data.layout;
        navigationConfig[key] = layoutResponse[key].data.navigation;
        autoSave = layoutResponse[key].data.autoSave;
        repeatingGroups = {
          ...repeatingGroups,
          ...getRepeatingGroups(layouts[key], formDataState.formData),
        };
      });
    }

    yield call(Actions.fetchFormLayoutFulfilled, layouts, navigationConfig);
    yield call(Actions.updateAutoSave, autoSave);
    yield call(Actions.updateRepeatingGroupsFulfilled, repeatingGroups);
    yield call(Actions.updateCurrentView, firstLayoutKey);
  } catch (err) {
    yield call(Actions.fetchFormLayoutRejected, err);
    yield call(QueueActions.dataTaskQueueError, err);
  }
}

export function* watchFetchFormLayoutSaga(): SagaIterator {
  while (true) {
    yield all([
      take(ActionTypes.FETCH_FORM_LAYOUT),
      take(FormDataActionTypes.FETCH_FORM_DATA_INITIAL),
      take(FormDataActionTypes.FETCH_FORM_DATA_FULFILLED),
    ]);
    const { org, app } = window as Window as IAltinnWindow;
    const url = `${window.location.origin}/${org}/${app}/api/resource/FormLayout.json`;
    yield call(fetchFormLayoutSaga, { url } as IFetchFormLayout);
  }
}

export function* fetchFormLayoutSettingsSaga(): SagaIterator {
  try {
    const settings: ILayoutSettings = yield call(get, getLayoutSettingsUrl());
    yield call(Actions.fetchFormLayoutSettingsFulfilled, settings);
  } catch (error) {
    if (error?.response?.status === 404) {
      // We accept that the app does not have a settings.json as this is not default
      yield call(Actions.fetchFormLayoutSettingsFulfilled, null);
    } else {
      yield call(Actions.fetchFormLayoutSettingsRejected, error);
    }
  }
}

export function* watchFetchFormLayoutSettingsSaga(): SagaIterator {
  yield all([
    take(ActionTypes.FETCH_FORM_LAYOUT_SETTINGS),
    take(ActionTypes.FETCH_FORM_LAYOUT_FULFILLED),
  ]);
  yield call(fetchFormLayoutSettingsSaga);
}

export function* updateCurrentViewSaga({ newView, runValidations }: IUpdateCurrentView): SagaIterator {
  try {
    if (!runValidations) {
      yield call(Actions.updateCurrentViewFulfilled, newView);
    } else {
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
      validations = Object.assign(validations, componentSpecificValidations);
      validations = Object.assign(validations, emptyFieldsValidations);
      const instanceId = state.instanceData.instance.id;
      const currentView = state.formLayout.uiConfig.currentView;
      const options: AxiosRequestConfig = {
        headers: {
          LayoutId: currentView,
        },
      };
      const serverValidation: any = yield call(get, getValidationUrl(instanceId), runValidations === 'page' ? options : null);
      // update validation state
      const layoutState: ILayoutState = state.formLayout;
      const mappedValidations =
        mapDataElementValidationToRedux(serverValidation, layoutState.layouts, state.textResources.resources);
      validations = Object.assign(validations, mappedValidations);
      validationResult.validations = validations;
      if (runValidations === 'page') {
        // only store validations for the specific page
        validations = { [currentView]: validations[currentView] };
      }
      FormValidationActions.updateValidations(validations);
      if (!canFormBeSaved({ validations: { [currentView]: validations[currentView] }, invalidDataTypes: false }, 'Complete')) {
        yield call(Actions.updateCurrentViewRejected, null);
      } else {
        yield call(Actions.updateCurrentViewFulfilled, newView);
      }
    }
  } catch (err) {
    yield call(Actions.updateCurrentViewRejected, err);
  }
}

export function* watchUpdateCurrentViewSaga(): SagaIterator {
  yield takeEvery(ActionTypes.UPDATE_CURRENT_VIEW, updateCurrentViewSaga);
}

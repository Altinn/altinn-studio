/* eslint-disable max-len */
import { SagaIterator } from 'redux-saga';
import { call, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { IRepeatingGroups, IRuntimeState } from 'src/types';
import { removeRepeatingGroupFromUIConfig } from 'src/utils/formLayout';
import { AxiosRequestConfig } from 'axios';
import { get } from 'altinn-shared/utils';
import { getDataTaskDataTypeId } from 'src/utils/appMetadata';
import { getValidationUrl } from 'src/utils/urlHelper';
import { createValidator, validateFormData, validateFormComponents, validateEmptyFields, mapDataElementValidationToRedux, canFormBeSaved } from 'src/utils/validation';
import { ILayoutComponent, ILayoutGroup } from '..';
import ConditionalRenderingActions from '../../dynamics/formDynamicsActions';
import FormLayoutActions from '../formLayoutActions';
import * as ActionTypes from '../formLayoutActionTypes';
import { IUpdateFocus, IUpdateAutoSave, IUpdateRepeatingGroups, IUpdateCurrentView } from './updateFormLayoutActions';
import { ILayoutState } from '../formLayoutReducer';
import { IFormDataState } from '../../data/formDataReducer';
import FormDataActions from '../../data/formDataActions';
import { convertDataBindingToModel, removeGroupData } from '../../../../utils/databindings';
import FormValidationActions from '../../validation/validationActions';

const selectFormLayoutConnection = (state: IRuntimeState): ILayoutState => state.formLayout;
const selectFormData = (state: IRuntimeState): IFormDataState => state.formData;

function* updateFocus({ currentComponentId, step }: IUpdateFocus): SagaIterator {
  try {
    const formLayoutState: ILayoutState = yield select(selectFormLayoutConnection);
    if (currentComponentId) {
      const layout = formLayoutState.layouts[formLayoutState.uiConfig.currentView];
      const currentComponentIndex = layout
        .findIndex((component: ILayoutComponent) => component.id === currentComponentId);
      const focusComponentIndex = step ? currentComponentIndex + step : currentComponentIndex;
      const focusComponentId = focusComponentIndex > 0 ? layout[focusComponentIndex].id : null;
      yield call(FormLayoutActions.updateFocusFulfilled, focusComponentId);
    } else {
      yield call(FormLayoutActions.updateFocusFulfilled, null);
    }
  } catch (err) {
    yield call(FormLayoutActions.updateFocusRejected, err);
  }
}

function* updateAutoSaveSaga({ autoSave }: IUpdateAutoSave): SagaIterator {
  try {
    yield call(FormLayoutActions.updateAutoSaveFulfilled, autoSave);
  } catch (err) {
    yield call(FormLayoutActions.updateAutoSaveRejected, err);
  }
}

function* updateRepeatingGroupsSaga({
  layoutElementId,
  remove,
  index,
}: IUpdateRepeatingGroups) {
  try {
    const formLayoutState: ILayoutState = yield select(selectFormLayoutConnection);
    const currentCount = formLayoutState.uiConfig.repeatingGroups[layoutElementId].count;
    const newCount = remove ? currentCount - 1 : currentCount + 1;
    let updatedRepeatingGroups: IRepeatingGroups = {
      ...formLayoutState.uiConfig.repeatingGroups,
      [layoutElementId]: {
        ...formLayoutState.uiConfig.repeatingGroups[layoutElementId],
        count: newCount,
      },
    };

    const children = (formLayoutState.layouts[formLayoutState.uiConfig.currentView].find((element) => element.id === layoutElementId) as ILayoutGroup)?.children;
    const childGroups: (ILayoutGroup | ILayoutComponent)[] = formLayoutState.layouts[formLayoutState.uiConfig.currentView].filter((
      (element) => (element.type === 'Group') && children?.indexOf(element.id) > -1));

    childGroups?.forEach((group: ILayoutGroup) => {
      if (remove) {
        updatedRepeatingGroups = removeRepeatingGroupFromUIConfig(updatedRepeatingGroups, group.id, index, true);
      } else {
        const groupId = `${group.id}-${newCount}`;
        updatedRepeatingGroups[groupId] = {
          count: -1,
          baseGroupId: group.id,
        };
      }
    });

    yield call(FormLayoutActions.updateRepeatingGroupsFulfilled, updatedRepeatingGroups);

    if (remove) {
      // Remove the form data associated with the group
      const formDataState: IFormDataState = yield select(selectFormData);
      const layout = formLayoutState.layouts[formLayoutState.uiConfig.currentView];
      const updatedFormData = removeGroupData(formDataState.formData, index,
        layout, layoutElementId, formLayoutState.uiConfig.repeatingGroups[layoutElementId]);

      yield call(FormDataActions.fetchFormDataFulfilled, updatedFormData);
      yield call(FormDataActions.saveFormData);
    }

    yield call(ConditionalRenderingActions.checkIfConditionalRulesShouldRun);
  } catch (err) {
    yield call(FormLayoutActions.updateRepeatingGroupsRejected, err);
  }
}

export function* updateCurrentViewSaga({
  newView, runValidations, returnToView,
}: IUpdateCurrentView): SagaIterator {
  try {
    if (!runValidations) {
      yield call(FormLayoutActions.updateCurrentViewFulfilled, newView, returnToView);
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
      yield call(FormValidationActions.updateValidations, validations);
      if (state.formLayout.uiConfig.returnToView) {
        yield call(FormLayoutActions.updateCurrentViewFulfilled, newView);
      } else if (!canFormBeSaved({ validations: { [currentView]: validations[currentView] }, invalidDataTypes: false }, 'Complete')) {
        yield call(FormLayoutActions.updateCurrentViewRejected, null);
      } else {
        yield call(FormLayoutActions.updateCurrentViewFulfilled, newView, returnToView);
      }
    }
  } catch (err) {
    yield call(FormLayoutActions.updateCurrentViewRejected, err);
  }
}

export function* watchUpdateCurrentViewSaga(): SagaIterator {
  yield takeEvery(ActionTypes.UPDATE_CURRENT_VIEW, updateCurrentViewSaga);
}

export function* watchUpdateFocusSaga(): SagaIterator {
  yield takeLatest(ActionTypes.UPDATE_FOCUS, updateFocus);
}

export function* watchUpdateAutoSave(): SagaIterator {
  yield takeLatest(ActionTypes.UPDATE_AUTO_SAVE, updateAutoSaveSaga);
}

export function* watchUpdateRepeatingGroupsSaga(): SagaIterator {
  yield takeLatest(ActionTypes.UPDATE_REPEATING_GROUPS, updateRepeatingGroupsSaga);
}

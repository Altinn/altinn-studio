/* eslint-disable max-len */
import { PayloadAction } from '@reduxjs/toolkit';
import { SagaIterator } from 'redux-saga';
import { all, call, put, select, take, takeEvery, takeLatest } from 'redux-saga/effects';
import { IRepeatingGroups, IRuntimeState, IValidationIssue, IValidations, Triggers } from 'src/types';
import { getRepeatingGroups, removeRepeatingGroupFromUIConfig } from 'src/utils/formLayout';
import { AxiosRequestConfig } from 'axios';
import { get, getCurrentTaskDataElementId, post } from 'altinn-shared/utils';
import { getDataTaskDataTypeId } from 'src/utils/appMetadata';
import { getCalculatePageOrderUrl, getDataValidationUrl, getValidationUrl } from 'src/utils/urlHelper';
import { createValidator, validateFormData, validateFormComponents, validateEmptyFields, mapDataElementValidationToRedux, canFormBeSaved, mergeValidationObjects, removeGroupValidationsByIndex, validateGroup } from 'src/utils/validation';
import { getLayoutsetForDataElement } from 'src/utils/layout';
import { startInitialDataTaskQueueFulfilled } from 'src/shared/resources/queue/queueSlice';
import { ILayoutComponent, ILayoutEntry, ILayoutGroup, ILayouts } from '..';
import ConditionalRenderingActions from '../../dynamics/formDynamicsActions';
import { FormLayoutActions, ILayoutState } from '../formLayoutSlice';
import { IUpdateFocus, IUpdateRepeatingGroups, IUpdateCurrentView, ICalculatePageOrderAndMoveToNextPage, IUpdateRepeatingGroupsEditIndex } from '../formLayoutTypes';
import { IFormDataState } from '../../data/formDataReducer';
import FormDataActions from '../../data/formDataActions';
import { convertDataBindingToModel, removeGroupData } from '../../../../utils/databindings';
import FormValidationActions from '../../validation/validationActions';

const selectFormLayoutState = (state: IRuntimeState): ILayoutState => state.formLayout;
const selectFormData = (state: IRuntimeState): IFormDataState => state.formData;
const selectFormLayouts = (state: IRuntimeState): ILayouts => state.formLayout.layouts;

function* updateFocus({ payload: { currentComponentId, step } }: PayloadAction<IUpdateFocus>): SagaIterator {
  try {
    const formLayoutState: ILayoutState = yield select(selectFormLayoutState);
    if (currentComponentId) {
      const layout = formLayoutState.layouts[formLayoutState.uiConfig.currentView];
      const currentComponentIndex = layout
        .findIndex((component: ILayoutComponent) => component.id === currentComponentId);
      const focusComponentIndex = step ? currentComponentIndex + step : currentComponentIndex;
      const focusComponentId = focusComponentIndex > 0 ? layout[focusComponentIndex].id : null;
      yield put(FormLayoutActions.updateFocusFulfilled({ focusComponentId }));
    } else {
      yield put(FormLayoutActions.updateFocusFulfilled({ focusComponentId: null }));
    }
  } catch (error) {
    yield put(FormLayoutActions.updateFocusRejected({ error }));
  }
}

function* updateRepeatingGroupsSaga({ payload: {
  layoutElementId,
  remove,
  index,
} }: PayloadAction<IUpdateRepeatingGroups>) {
  try {
    const formLayoutState: ILayoutState = yield select(selectFormLayoutState);
    const currentCount = formLayoutState.uiConfig.repeatingGroups[layoutElementId]?.count ?? -1;
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
          editIndex: -1,
        };
      }
    });

    yield put(FormLayoutActions.updateRepeatingGroupsFulfilled({ repeatingGroups: updatedRepeatingGroups }));

    if (remove) {
      // Remove the form data associated with the group
      const formDataState: IFormDataState = yield select(selectFormData);
      const state: IRuntimeState = yield select();
      const layout = formLayoutState.layouts[formLayoutState.uiConfig.currentView];
      const updatedFormData = removeGroupData(formDataState.formData, index,
        layout, layoutElementId, formLayoutState.uiConfig.repeatingGroups[layoutElementId]);

      // Remove the validations associated with the group
      const updatedValidations = removeGroupValidationsByIndex(layoutElementId, index, formLayoutState.uiConfig.currentView, formLayoutState.layouts, formLayoutState.uiConfig.repeatingGroups, state.formValidations.validations);
      yield call(FormValidationActions.updateValidations, updatedValidations);

      yield put(FormDataActions.setFormDataFulfilled({ formData: updatedFormData }));
      yield put(FormDataActions.saveFormData());
    }

    yield call(ConditionalRenderingActions.checkIfConditionalRulesShouldRun);
  } catch (error) {
    yield put(FormLayoutActions.updateRepeatingGroupsRejected({ error }));
  }
}

export function* updateCurrentViewSaga({ payload: {
  newView,
  runValidations,
  returnToView,
  skipPageCaching,
} }: PayloadAction<IUpdateCurrentView>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    let currentViewCacheKey: string = state.formLayout.uiConfig.currentViewCacheKey;
    if (!currentViewCacheKey) {
      currentViewCacheKey = state.instanceData.instance.id;
      yield put(FormLayoutActions.setCurrentViewCacheKey({ key: currentViewCacheKey }));
    }
    if (!runValidations) {
      if (!skipPageCaching) {
        localStorage.setItem(currentViewCacheKey, newView);
      }
      yield put(FormLayoutActions.updateCurrentViewFulfilled({ newView, returnToView }));
    } else {
      const currentDataTaskDataTypeId = getDataTaskDataTypeId(
        state.instanceData.instance.process.currentTask.elementId,
        state.applicationMetadata.applicationMetadata.dataTypes,
      );
      const layoutOrder: string[] = state.formLayout.uiConfig.layoutOrder;
      const schema = state.formDataModel.schemas[currentDataTaskDataTypeId];
      const validator = createValidator(schema);
      const model = convertDataBindingToModel(state.formData.formData);
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
      validations = mergeValidationObjects(validations, emptyFieldsValidations);
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
      validations = mergeValidationObjects(validations, mappedValidations);
      validationResult.validations = validations;
      if (runValidations === 'page') {
        // only store validations for the specific page
        validations = { [currentView]: validations[currentView] };
      }
      yield call(FormValidationActions.updateValidations, validations);
      if (state.formLayout.uiConfig.returnToView) {
        if (!skipPageCaching) {
          localStorage.setItem(currentViewCacheKey, newView);
        }
        yield put(FormLayoutActions.updateCurrentViewFulfilled({ newView }));
      } else if (!canFormBeSaved({ validations: { [currentView]: validations[currentView] }, invalidDataTypes: false }, 'Complete')) {
        yield put(FormLayoutActions.updateCurrentViewRejected({ error: null }));
      } else {
        if (!skipPageCaching) {
          localStorage.setItem(currentViewCacheKey, newView);
        }
        yield put(FormLayoutActions.updateCurrentViewFulfilled({ newView, returnToView }));
      }
    }
  } catch (error) {
    yield put(FormLayoutActions.updateCurrentViewRejected({ error }));
  }
}

export function* calculatePageOrderAndMoveToNextPageSaga({ payload: { runValidations, skipMoveToNext } }: PayloadAction<ICalculatePageOrderAndMoveToNextPage>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const layoutSets = state.formLayout.layoutsets;
    const currentView = state.formLayout.uiConfig.currentView;
    const instance = state.instanceData.instance;
    const dataTypeId: string = getDataTaskDataTypeId(instance.process.currentTask.elementId,
      state.applicationMetadata.applicationMetadata.dataTypes);
    let layoutSetId: string = null;
    if (layoutSets != null) {
      layoutSetId = getLayoutsetForDataElement(instance, dataTypeId, layoutSets);
    }
    const formData: any = convertDataBindingToModel(state.formData.formData);
    const layoutOrder = yield call(
      post,
      getCalculatePageOrderUrl(),
      formData,
      {
        params: {
          currentPage: currentView,
          layoutSetId,
          dataTypeId,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    yield put(FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({ order: layoutOrder }));
    if (skipMoveToNext) {
      return;
    }
    const returnToView = state.formLayout.uiConfig.returnToView;
    const newView = returnToView || layoutOrder[layoutOrder.indexOf(currentView) + 1];
    yield put(FormLayoutActions.updateCurrentView({ newView, runValidations }));
  } catch (error) {
    if (error?.response?.status === 404) {
      // We accept that the app does noe have defined a calculate page order as this is not default for older apps
    } else {
      yield put(FormLayoutActions.calculatePageOrderAndMoveToNextPageRejected({ error }));
    }
  }
}

export function* watchCalculatePageOrderAndMoveToNextPageSaga(): SagaIterator {
  yield takeEvery(FormLayoutActions.calculatePageOrderAndMoveToNextPage, calculatePageOrderAndMoveToNextPageSaga);
}

export function* watchInitialCalculagePageOrderAndMoveToNextPageSaga(): SagaIterator {
  while (true) {
    yield all([
      take(startInitialDataTaskQueueFulfilled),
      take(FormLayoutActions.fetchLayoutFulfilled),
      take(FormLayoutActions.fetchLayoutSettingsFulfilled),
    ]);
    const state: IRuntimeState = yield select();
    const layouts = state.formLayout.layouts;
    const pageTriggers = state.formLayout.uiConfig.pageTriggers;
    const appHasCalculateTrigger = pageTriggers?.includes(Triggers.CalculatePageOrder) || Object.keys(layouts).some((layout) => {
      return layouts[layout].some((element: ILayoutEntry) => {
        if (element.type === 'NavigationButtons') {
          const layoutComponent = element as ILayoutComponent;
          if (layoutComponent?.triggers?.includes(Triggers.CalculatePageOrder)) {
            return true;
          }
        }
        return false;
      });
    });
    if (appHasCalculateTrigger) {
      yield put(FormLayoutActions.calculatePageOrderAndMoveToNextPage({ skipMoveToNext: true }));
    }
  }
}

export function* watchUpdateCurrentViewSaga(): SagaIterator {
  yield takeEvery(FormLayoutActions.updateCurrentView, updateCurrentViewSaga);
}

export function* watchUpdateFocusSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.updateFocus, updateFocus);
}

export function* watchUpdateRepeatingGroupsSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.updateRepeatingGroups, updateRepeatingGroupsSaga);
}

export function* updateRepeatingGroupEditIndexSaga({ payload: {
  group, index, validate,
} }: PayloadAction<IUpdateRepeatingGroupsEditIndex>): SagaIterator {
  try {
    if (validate) {
      const state: IRuntimeState = yield select();
      const validations: IValidations = state.formValidations.validations;
      const currentView = state.formLayout.uiConfig.currentView;
      const frontendValidations: IValidations = validateGroup(group, state);
      const options: AxiosRequestConfig = {
        headers: {
          ComponentId: group,
        },
      };
      const currentTaskDataId = getCurrentTaskDataElementId(
        state.applicationMetadata.applicationMetadata,
        state.instanceData.instance,
      );
      const serverValidations: IValidationIssue[] = yield call(get, getDataValidationUrl(state.instanceData.instance.id, currentTaskDataId), options);
      const mappedServerValidations: IValidations = mapDataElementValidationToRedux(serverValidations, state.formLayout.layouts, state.textResources.resources);
      const combinedValidations = mergeValidationObjects(frontendValidations, mappedServerValidations);
      if (canFormBeSaved({ validations: combinedValidations, invalidDataTypes: false }, 'Complete')) {
        yield put(FormLayoutActions.updateRepeatingGroupsEditIndexFulfilled({ group, index }));
      } else {
        yield put(FormLayoutActions.updateRepeatingGroupsEditIndexRejected({ error: null }));
        // only overwrite validtions specific to the group - leave all other untouched
        const newValidations = { ...validations, [currentView]: { ...validations[currentView], ...combinedValidations[currentView] } };
        yield call(FormValidationActions.updateValidations, newValidations);
      }
    } else {
      yield put(FormLayoutActions.updateRepeatingGroupsEditIndexFulfilled({ group, index }));
    }
  } catch (error) {
    yield put(FormLayoutActions.updateRepeatingGroupsEditIndexRejected({ error }));
  }
}

export function* watchUpdateRepeatingGroupsEditIndexSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.updateRepeatingGroupsEditIndex, updateRepeatingGroupEditIndexSaga);
}

export function* initRepeatingGroupsSaga(): SagaIterator {
  const formDataState: IFormDataState = yield select(selectFormData);
  const state: IRuntimeState = yield select();
  const currentGroups = state.formLayout.uiConfig.repeatingGroups;
  const layouts = yield select(selectFormLayouts);
  let newGroups: IRepeatingGroups = {};
  Object.keys(layouts).forEach((layoutKey: string) => {
    newGroups = {
      ...newGroups,
      ...getRepeatingGroups(layouts[layoutKey], formDataState.formData),
    };
  });
  // if any groups have been removed as part of calculation we delete the associated validations
  const currentKeyes = Object.keys(currentGroups || {});
  const groupsToRemoveValidaitons = currentKeyes.filter((key) => {
    return (currentGroups[key].count > -1) && (!newGroups[key] || newGroups[key].count === -1);
  });
  if (groupsToRemoveValidaitons.length > 0) {
    let validations = state.formValidations.validations;
    // eslint-disable-next-line no-restricted-syntax
    for (const group of groupsToRemoveValidaitons) {
      for (let i = 0; i <= currentGroups[group].count; i++) {
        validations = removeGroupValidationsByIndex(group, i, state.formLayout.uiConfig.currentView, layouts, currentGroups, validations, false);
      }
    }
    yield call(FormValidationActions.updateValidations, validations);
  }
  yield put(FormLayoutActions.updateRepeatingGroupsFulfilled({ repeatingGroups: newGroups }));
}

export function* watchInitRepeatingGroupsSaga(): SagaIterator {
  yield take(FormLayoutActions.fetchLayoutFulfilled);
  yield call(initRepeatingGroupsSaga);
  yield takeLatest([FormDataActions.fetchFormDataFulfilled, FormLayoutActions.initRepeatingGroups], initRepeatingGroupsSaga);
}

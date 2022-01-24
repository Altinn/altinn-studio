/* eslint-disable max-len */
import { PayloadAction } from '@reduxjs/toolkit';
import { SagaIterator } from 'redux-saga';
import { all, call, put, select, take, takeEvery, takeLatest } from 'redux-saga/effects';
import { IFileUploadersWithTag, IFormFileUploaderWithTagComponent, IRepeatingGroups, IRuntimeState, IValidationIssue, IValidations, Triggers } from 'src/types';
import { getFileUploadersWithTag, getRepeatingGroups, removeRepeatingGroupFromUIConfig } from 'src/utils/formLayout';
import { AxiosRequestConfig } from 'axios';
import { get, post } from 'altinn-shared/utils';
import { getCurrentTaskDataElementId, getDataTaskDataTypeId } from 'src/utils/appMetadata';
import { getCalculatePageOrderUrl, getDataValidationUrl } from 'src/utils/appUrlHelper';
import { validateFormData, validateFormComponents, validateEmptyFields, mapDataElementValidationToRedux, canFormBeSaved, mergeValidationObjects, removeGroupValidationsByIndex, validateGroup, getValidator } from 'src/utils/validation';
import { getLayoutsetForDataElement } from 'src/utils/layout';
import { startInitialDataTaskQueueFulfilled } from 'src/shared/resources/queue/queueSlice';
import { updateValidations } from 'src/features/form/validation/validationSlice';
import { IAttachmentState } from 'src/shared/resources/attachments/attachmentReducer';
import { ILayoutComponent, ILayoutEntry, ILayoutGroup, ILayouts } from '..';
import ConditionalRenderingActions from '../../dynamics/formDynamicsActions';
import { FormLayoutActions, ILayoutState } from '../formLayoutSlice';
import { IUpdateFocus, IUpdateRepeatingGroups, IUpdateCurrentView, ICalculatePageOrderAndMoveToNextPage, IUpdateRepeatingGroupsEditIndex, IUpdateFileUploaderWithTagEditIndex, IUpdateFileUploaderWithTagChosenOptions } from '../formLayoutTypes';
import { IFormDataState } from '../../data/formDataReducer';
import FormDataActions from '../../data/formDataActions';
import { convertDataBindingToModel, removeGroupData } from '../../../../utils/databindings';

const selectFormLayoutState = (state: IRuntimeState): ILayoutState => state.formLayout;
const selectFormData = (state: IRuntimeState): IFormDataState => state.formData;
const selectFormLayouts = (state: IRuntimeState): ILayouts => state.formLayout.layouts;
const selectAttachmentState = (state: IRuntimeState): IAttachmentState => state.attachments;

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

    const groupContainer: ILayoutGroup = formLayoutState.layouts[formLayoutState.uiConfig.currentView].find((element) => element.id === layoutElementId) as ILayoutGroup;
    const children = groupContainer?.children;
    const childGroups: (ILayoutGroup | ILayoutComponent)[] = formLayoutState.layouts[formLayoutState.uiConfig.currentView].filter(
      (element) => {
        if (element.type.toLowerCase() !== 'group') {
          return false;
        }

        if (groupContainer?.edit?.multiPage) {
          return children.find((c) => c.split(':')[1] === element.id);
        }

        return children?.indexOf(element.id) > -1;
      },
    );

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
      const updatedValidations = removeGroupValidationsByIndex(
        layoutElementId, index, formLayoutState.uiConfig.currentView, formLayoutState.layouts,
        formLayoutState.uiConfig.repeatingGroups, state.formValidations.validations,
      );
      yield put(updateValidations({ validations: updatedValidations }));

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
      const validator = getValidator(currentDataTaskDataTypeId, state.formDataModel.schemas);
      const model = convertDataBindingToModel(state.formData.formData);
      const validationResult = validateFormData(
        model, state.formLayout.layouts, layoutOrder,
        validator, state.language.language, state.textResources.resources,
      );

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
      let validations = mergeValidationObjects(validationResult.validations, componentSpecificValidations, emptyFieldsValidations);
      const instanceId = state.instanceData.instance.id;
      const currentView = state.formLayout.uiConfig.currentView;
      const options: AxiosRequestConfig = {
        headers: {
          LayoutId: currentView,
        },
      };

      const currentTaskDataId = getCurrentTaskDataElementId(
        state.applicationMetadata.applicationMetadata,
        state.instanceData.instance,
      );
      const serverValidation: any = yield call(get, getDataValidationUrl(instanceId, currentTaskDataId), runValidations === 'page' ? options : null);
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
      yield put(updateValidations({ validations }));
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
        yield put(updateValidations({ validations: newValidations }));
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
  const currentGroupKeys = Object.keys(currentGroups || {});
  const groupsToRemoveValidations = currentGroupKeys.filter((key) => {
    return (currentGroups[key].count > -1) && (!newGroups[key] || newGroups[key].count === -1);
  });
  if (groupsToRemoveValidations.length > 0) {
    let validations = state.formValidations.validations;
    for (const group of groupsToRemoveValidations) {
      for (let i = 0; i <= currentGroups[group].count; i++) {
        validations = removeGroupValidationsByIndex(group, i, state.formLayout.uiConfig.currentView, layouts, currentGroups, validations, false);
      }
    }
    yield put(updateValidations({ validations }));
  }
  // preserve current edit index if still valid
  currentGroupKeys.filter((key) => !groupsToRemoveValidations.includes(key)).forEach((key) => {
    if (newGroups[key]?.count >= currentGroups[key].editIndex) {
      newGroups[key].editIndex = currentGroups[key].editIndex;
    }
  });
  yield put(FormLayoutActions.updateRepeatingGroupsFulfilled({ repeatingGroups: newGroups }));
}

export function* watchInitRepeatingGroupsSaga(): SagaIterator {
  yield take(FormLayoutActions.fetchLayoutFulfilled);
  yield call(initRepeatingGroupsSaga);
  yield takeLatest([
    FormDataActions.fetchFormDataFulfilled,
    FormLayoutActions.initRepeatingGroups,
    FormLayoutActions.fetchLayoutFulfilled
    ],
    initRepeatingGroupsSaga
  );
}

export function* updateFileUploaderWithTagEditIndexSaga({ payload: {
  uploader, index, attachmentId = null
} }: PayloadAction<IUpdateFileUploaderWithTagEditIndex>): SagaIterator {
  try {
    if (attachmentId && index === -1) { // In the case of closing an edit view.
      const state: IRuntimeState = yield select();
      const chosenOption = state.formLayout.uiConfig.fileUploadersWithTag[uploader].chosenOptions[attachmentId]
      if(chosenOption && chosenOption !== '') {
        yield put(FormLayoutActions.updateFileUploaderWithTagEditIndexFulfilled({ uploader, index }));
      } else {
        yield put(FormLayoutActions.updateFileUploaderWithTagEditIndexRejected({ error: null }));
      }
    } else {
      yield put(FormLayoutActions.updateFileUploaderWithTagEditIndexFulfilled({ uploader, index }));
    }
  } catch (error) {
    yield put(FormLayoutActions.updateFileUploaderWithTagEditIndexRejected({ error }));
  }
}

export function* watchUpdateFileUploaderWithTagEditIndexSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.updateFileUploaderWithTagEditIndex, updateFileUploaderWithTagEditIndexSaga);
}

export function* updateFileUploaderWithTagChosenOptionsSaga({ payload: {
  uploader, id, option
} }: PayloadAction<IUpdateFileUploaderWithTagChosenOptions>): SagaIterator {
  try {
    // Validate option to available options
    const state: IRuntimeState = yield select();
    const currentView = state.formLayout.uiConfig.currentView;
    const component = state.formLayout.layouts[currentView]
        .find((component: ILayoutComponent) => component.id === uploader) as unknown as IFormFileUploaderWithTagComponent;
    const componentOptions = state.optionState.options[component.optionsId]

    if (componentOptions.find(op => op.value === option.value)) {
      yield put(FormLayoutActions.updateFileUploaderWithTagChosenOptionsFulfilled({
        uploader, id, option,
      }));
    } else {
      yield put(FormLayoutActions.updateFileUploaderWithTagChosenOptionsRejected({ error: null }));
    }
  } catch (error) {
    yield put(FormLayoutActions.updateFileUploaderWithTagChosenOptionsRejected({ error }));
  }
}

export function* watchUpdateFileUploaderWithTagChosenOptionsSaga(): SagaIterator {
  yield takeLatest(FormLayoutActions.updateFileUploaderWithTagChosenOptions, updateFileUploaderWithTagChosenOptionsSaga);
}

export function* initFileUploaderWithTagSaga(): SagaIterator {
  const attachmentState: IAttachmentState = yield select(selectAttachmentState);
  const layouts = yield select(selectFormLayouts);
  let newUploads: IFileUploadersWithTag = {};
  Object.keys(layouts).forEach((layoutKey: string) => {
    newUploads = {
      ...newUploads,
      ...getFileUploadersWithTag(layouts[layoutKey], attachmentState),
    };
  });
  yield put(FormLayoutActions.updateFileUploadersWithTagFulfilled({ uploaders: newUploads }));
}

export function* watchInitFileUploaderWithTagSaga(): SagaIterator {
  yield take(FormLayoutActions.fetchLayoutFulfilled);
  yield call(initFileUploaderWithTagSaga);
  yield takeLatest([FormLayoutActions.initFileUploaderWithTag], initFileUploaderWithTagSaga);
}

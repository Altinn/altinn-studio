import {
  actionChannel,
  all,
  call,
  put,
  race,
  select,
  take,
  takeLatest,
} from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { Triggers } from 'src/types';
import {
  getCurrentDataTypeForApplication,
  getCurrentTaskDataElementId,
  getDataTaskDataTypeId,
  isStatelessApp,
} from 'src/utils/appMetadata';
import {
  getCalculatePageOrderUrl,
  getDataValidationUrl,
} from 'src/utils/appUrlHelper';
import { shiftAttachmentRowInRepeatingGroup } from 'src/utils/attachment';
import {
  convertDataBindingToModel,
  findChildAttachments,
  removeGroupData,
} from 'src/utils/databindings';
import {
  findChildren,
  getRepeatingGroups,
  mapFileUploadersWithTag,
  removeRepeatingGroupFromUIConfig,
  splitDashedKey,
} from 'src/utils/formLayout';
import { getLayoutsetForDataElement } from 'src/utils/layout';
import { getOptionLookupKey } from 'src/utils/options';
import {
  canFormBeSaved,
  mapDataElementValidationToRedux,
  mergeValidationObjects,
  removeGroupValidationsByIndex,
  runClientSideValidation,
  validateGroup,
} from 'src/utils/validation';
import type { IFormDataState } from 'src/features/form/data';
import type {
  ILayoutCompFileUploadWithTag,
  ILayoutComponent,
  ILayoutComponentOrGroup,
  ILayoutGroup,
  ILayouts,
} from 'src/features/form/layout';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
import type {
  ICalculatePageOrderAndMoveToNextPage,
  IUpdateCurrentView,
  IUpdateFileUploaderWithTagChosenOptions,
  IUpdateFileUploaderWithTagEditIndex,
  IUpdateRepeatingGroups,
  IUpdateRepeatingGroupsEditIndex,
} from 'src/features/form/layout/formLayoutTypes';
import type { IAttachmentState } from 'src/shared/resources/attachments';
import type {
  IDeleteAttachmentActionFulfilled,
  IDeleteAttachmentActionRejected,
} from 'src/shared/resources/attachments/delete/deleteAttachmentActions';
import type {
  IFileUploadersWithTag,
  IRepeatingGroups,
  IRuntimeState,
  IValidationIssue,
  IValidations,
} from 'src/types';

import { get, post } from 'altinn-shared/utils';

export const selectFormLayoutState = (state: IRuntimeState): ILayoutState =>
  state.formLayout;
export const selectFormData = (state: IRuntimeState): IFormDataState =>
  state.formData;
export const selectFormLayouts = (state: IRuntimeState): ILayouts =>
  state.formLayout.layouts;
export const selectAttachmentState = (state: IRuntimeState): IAttachmentState =>
  state.attachments;
export const selectValidations = (state: IRuntimeState): IValidations =>
  state.formValidations.validations;
export const selectUnsavedChanges = (state: IRuntimeState): boolean =>
  state.formData.unsavedChanges;

export function* updateRepeatingGroupsSaga({
  payload: { layoutElementId, remove, index, leaveOpen },
}: PayloadAction<IUpdateRepeatingGroups>): SagaIterator {
  try {
    const formLayoutState: ILayoutState = yield select(selectFormLayoutState);
    const currentIndex =
      formLayoutState.uiConfig.repeatingGroups[layoutElementId]?.index ?? -1;
    const newIndex = remove ? currentIndex - 1 : currentIndex + 1;
    let updatedRepeatingGroups: IRepeatingGroups = {
      ...formLayoutState.uiConfig.repeatingGroups,
      [layoutElementId]: {
        ...formLayoutState.uiConfig.repeatingGroups[layoutElementId],
        index: newIndex,
      },
    };

    const groupContainer: ILayoutGroup = formLayoutState.layouts[
      formLayoutState.uiConfig.currentView
    ].find((element) => element.id === layoutElementId) as ILayoutGroup;
    const children = groupContainer?.children;
    const childGroups: (ILayoutGroup | ILayoutComponent)[] =
      formLayoutState.layouts[formLayoutState.uiConfig.currentView].filter(
        (element) => {
          if (element.type !== 'Group') {
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
        updatedRepeatingGroups = removeRepeatingGroupFromUIConfig(
          updatedRepeatingGroups,
          group.id,
          index,
          true,
        );
      } else {
        const groupId = `${group.id}-${newIndex}`;
        updatedRepeatingGroups[groupId] = {
          index: -1,
          baseGroupId: group.id,
          editIndex: -1,
        };
      }
    });

    if (remove) {
      const formDataState: IFormDataState = yield select(selectFormData);
      const attachments: IAttachmentState = yield select(selectAttachmentState);
      const layout =
        formLayoutState.layouts[formLayoutState.uiConfig.currentView];
      const validations: IValidations = yield select(selectValidations);
      const repeatingGroup =
        formLayoutState.uiConfig.repeatingGroups[layoutElementId];

      // Find uploaded attachments inside group and delete them
      const childAttachments = findChildAttachments(
        formDataState.formData,
        attachments.attachments,
        layout,
        layoutElementId,
        repeatingGroup,
        index,
      );

      let attachmentRemovalSuccessful = true;
      for (const { attachment, component, componentId } of childAttachments) {
        yield put(
          AttachmentActions.deleteAttachment({
            attachment,
            attachmentType: component.id,
            componentId,

            // Deleting attachment, but deliberately avoiding passing the dataModelBindings to avoid removing the formData
            // references. We're doing that ourselves here later, and having other sagas compete for it will cause race
            // conditions and lots of useless requests.
            dataModelBindings: {},
          }),
        );

        while (true) {
          const completion: {
            fulfilled?: PayloadAction<IDeleteAttachmentActionFulfilled>;
            rejected?: PayloadAction<IDeleteAttachmentActionRejected>;
          } = yield race({
            fulfilled: take(AttachmentActions.deleteAttachmentFulfilled),
            rejected: take(AttachmentActions.deleteAttachmentRejected),
          });
          const attachmentId =
            completion.fulfilled?.payload.attachmentId ||
            completion.rejected.payload.attachment.id;
          if (attachmentId !== attachment.id) {
            // Some other attachment elsewhere had its event complete, we'll ignore it
            continue;
          }
          if (completion.rejected) {
            attachmentRemovalSuccessful = false;
          }
          break;
        }
      }

      if (attachmentRemovalSuccessful) {
        const attachments: IAttachmentState = yield select(
          selectAttachmentState,
        );
        const splitLayoutElementId = splitDashedKey(layoutElementId);
        const childFileUploaders = findChildren(layout, {
          matching: (c) =>
            c.type === 'FileUpload' || c.type === 'FileUploadWithTag',
          rootGroupId: splitLayoutElementId.baseComponentId,
        });
        const updatedAttachments = shiftAttachmentRowInRepeatingGroup(
          attachments.attachments,
          childFileUploaders,
          layoutElementId,
          index,
        );

        // Remove the form data associated with the group
        const updatedFormData = removeGroupData(
          formDataState.formData,
          index,
          layout,
          layoutElementId,
          repeatingGroup,
        );

        // Remove the validations associated with the group
        const updatedValidations = removeGroupValidationsByIndex(
          layoutElementId,
          index,
          formLayoutState.uiConfig.currentView,
          formLayoutState.layouts,
          formLayoutState.uiConfig.repeatingGroups,
          validations,
        );
        yield put(
          ValidationActions.updateValidations({
            validations: updatedValidations,
          }),
        );

        updatedRepeatingGroups[layoutElementId].deletingIndex =
          updatedRepeatingGroups[layoutElementId].deletingIndex?.filter(
            (value) => value !== index,
          );
        updatedRepeatingGroups[layoutElementId].editIndex = -1;

        if (leaveOpen && index === 0) {
          updatedRepeatingGroups[layoutElementId].index = 0;
          updatedRepeatingGroups[layoutElementId].editIndex = 0;
        }

        yield put(
          FormLayoutActions.updateRepeatingGroupsFulfilled({
            repeatingGroups: updatedRepeatingGroups,
          }),
        );
        yield put(FormDataActions.setFulfilled({ formData: updatedFormData }));
        yield put(
          AttachmentActions.mapAttachmentsFulfilled({
            attachments: updatedAttachments,
          }),
        );
        yield put(FormDataActions.save());
      } else {
        yield put(
          FormLayoutActions.updateRepeatingGroupsRemoveCancelled({
            layoutElementId,
            index,
          }),
        );
      }
    } else {
      updatedRepeatingGroups[layoutElementId].editIndex = index;
      yield put(
        FormLayoutActions.updateRepeatingGroupsFulfilled({
          repeatingGroups: updatedRepeatingGroups,
        }),
      );
    }

    yield put(FormDynamicsActions.checkIfConditionalRulesShouldRun({}));
  } catch (error) {
    yield put(FormLayoutActions.updateRepeatingGroupsRejected({ error }));
  }
}

export function* updateCurrentViewSaga({
  payload: {
    newView,
    runValidations,
    returnToView,
    skipPageCaching,
    keepScrollPos,
    focusComponentId,
  },
}: PayloadAction<IUpdateCurrentView>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const viewCacheKey = state.formLayout.uiConfig.currentViewCacheKey;
    const instanceId = state.instanceData.instance?.id || 'NO-INSTANCE';
    if (!viewCacheKey) {
      yield put(FormLayoutActions.setCurrentViewCacheKey({ key: instanceId }));
    }
    const currentViewCacheKey = viewCacheKey || instanceId;
    if (!runValidations) {
      if (!skipPageCaching) {
        localStorage.setItem(currentViewCacheKey, newView);
      }
      yield put(
        FormLayoutActions.updateCurrentViewFulfilled({
          newView,
          returnToView,
          focusComponentId,
        }),
      );
    } else {
      const {
        validationResult,
        componentSpecificValidations,
        emptyFieldsValidations,
      } = runClientSideValidation(state);
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
      const serverValidation: any = yield call(
        get,
        getDataValidationUrl(instanceId, currentTaskDataId),
        runValidations === 'page' ? options : null,
      );
      // update validation state
      const layoutState: ILayoutState = state.formLayout;
      const mappedValidations = mapDataElementValidationToRedux(
        serverValidation,
        layoutState.layouts,
        state.textResources.resources,
      );
      validationResult.validations = mergeValidationObjects(
        validationResult.validations,
        componentSpecificValidations,
        emptyFieldsValidations,
        mappedValidations,
      );
      const validations =
        runValidations === 'page'
          ? { [currentView]: validationResult.validations[currentView] } // only store validations for the specific page
          : validationResult.validations;
      yield put(ValidationActions.updateValidations({ validations }));
      if (state.formLayout.uiConfig.returnToView) {
        if (!skipPageCaching) {
          localStorage.setItem(currentViewCacheKey, newView);
        }
        yield put(
          FormLayoutActions.updateCurrentViewFulfilled({
            newView,
            focusComponentId,
          }),
        );
      } else if (
        !canFormBeSaved(
          {
            validations: { [currentView]: validations[currentView] },
            invalidDataTypes: false,
          },
          'Complete',
        )
      ) {
        yield put(
          FormLayoutActions.updateCurrentViewRejected({
            error: null,
            keepScrollPos,
          }),
        );
      } else {
        if (!skipPageCaching) {
          localStorage.setItem(currentViewCacheKey, newView);
        }
        yield put(
          FormLayoutActions.updateCurrentViewFulfilled({
            newView,
            returnToView,
            focusComponentId,
          }),
        );
      }
    }
  } catch (error) {
    yield put(FormLayoutActions.updateCurrentViewRejected({ error }));
  }
}

export function* calculatePageOrderAndMoveToNextPageSaga({
  payload: { runValidations, skipMoveToNext, keepScrollPos },
}: PayloadAction<ICalculatePageOrderAndMoveToNextPage>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const layoutSets = state.formLayout.layoutsets;
    const currentView = state.formLayout.uiConfig.currentView;
    let layoutSetId: string = null;
    let dataTypeId: string = null;
    const formData = convertDataBindingToModel(state.formData.formData);
    const appIsStateless = isStatelessApp(
      state.applicationMetadata.applicationMetadata,
    );
    if (appIsStateless) {
      dataTypeId = getCurrentDataTypeForApplication({
        application: state.applicationMetadata.applicationMetadata,
        layoutSets: state.formLayout.layoutsets,
      });
      layoutSetId = state.applicationMetadata.applicationMetadata.onEntry.show;
    } else {
      const instance = state.instanceData.instance;
      dataTypeId = getDataTaskDataTypeId(
        instance.process.currentTask.elementId,
        state.applicationMetadata.applicationMetadata.dataTypes,
      );
      if (layoutSets != null) {
        layoutSetId = getLayoutsetForDataElement(
          instance,
          dataTypeId,
          layoutSets,
        );
      }
    }
    const layoutOrder = yield call(
      post,
      getCalculatePageOrderUrl(appIsStateless),
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
    yield put(
      FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
        order: layoutOrder,
      }),
    );
    if (skipMoveToNext) {
      return;
    }
    const returnToView = state.formLayout.uiConfig.returnToView;
    const newView =
      returnToView || layoutOrder[layoutOrder.indexOf(currentView) + 1];
    yield put(
      FormLayoutActions.updateCurrentView({
        newView,
        runValidations,
        keepScrollPos,
      }),
    );
  } catch (error) {
    if (error?.response?.status === 404) {
      // We accept that the app does noe have defined a calculate page order as this is not default for older apps
    } else {
      yield put(
        FormLayoutActions.calculatePageOrderAndMoveToNextPageRejected({
          error,
        }),
      );
    }
  }
}

export function* watchInitialCalculatePageOrderAndMoveToNextPageSaga(): SagaIterator {
  while (true) {
    yield all([
      take(QueueActions.startInitialDataTaskQueueFulfilled),
      take(FormLayoutActions.fetchFulfilled),
      take(FormLayoutActions.fetchSettingsFulfilled),
    ]);
    const state: IRuntimeState = yield select();
    const layouts = state.formLayout.layouts;
    const pageTriggers = state.formLayout.uiConfig.pageTriggers;
    const appHasCalculateTrigger =
      pageTriggers?.includes(Triggers.CalculatePageOrder) ||
      Object.keys(layouts).some((layout) => {
        return layouts[layout].some((element: ILayoutComponentOrGroup) => {
          if (element.type === 'NavigationButtons') {
            const layoutComponent = element as ILayoutComponent;
            if (
              layoutComponent?.triggers?.includes(Triggers.CalculatePageOrder)
            ) {
              return true;
            }
          }
          return false;
        });
      });
    if (appHasCalculateTrigger) {
      yield put(
        FormLayoutActions.calculatePageOrderAndMoveToNextPage({
          skipMoveToNext: true,
        }),
      );
    }
  }
}

export function* watchUpdateCurrentViewSaga(): SagaIterator {
  const requestChan = yield actionChannel(FormLayoutActions.updateCurrentView);
  while (true) {
    yield take(FormLayoutActions.updateCurrentView);
    const hasUnsavedChanges = yield select(selectUnsavedChanges);
    if (hasUnsavedChanges) {
      yield take(FormDataActions.submitFulfilled);
    }
    const value = yield take(requestChan);
    yield call(updateCurrentViewSaga, value);
  }
}

export function* updateRepeatingGroupEditIndexSaga({
  payload: { group, index, validate },
}: PayloadAction<IUpdateRepeatingGroupsEditIndex>): SagaIterator {
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
      const serverValidations: IValidationIssue[] = yield call(
        get,
        getDataValidationUrl(state.instanceData.instance.id, currentTaskDataId),
        options,
      );
      const mappedServerValidations: IValidations =
        mapDataElementValidationToRedux(
          serverValidations,
          state.formLayout.layouts,
          state.textResources.resources,
        );
      const combinedValidations = mergeValidationObjects(
        frontendValidations,
        mappedServerValidations,
      );
      if (
        canFormBeSaved(
          { validations: combinedValidations, invalidDataTypes: false },
          'Complete',
        )
      ) {
        yield put(
          FormLayoutActions.updateRepeatingGroupsEditIndexFulfilled({
            group,
            index,
          }),
        );
      } else {
        yield put(
          FormLayoutActions.updateRepeatingGroupsEditIndexRejected({
            error: null,
          }),
        );
        // only overwrite validtions specific to the group - leave all other untouched
        const newValidations = {
          ...validations,
          [currentView]: {
            ...validations[currentView],
            ...combinedValidations[currentView],
          },
        };
        yield put(
          ValidationActions.updateValidations({ validations: newValidations }),
        );
      }
    } else {
      yield put(
        FormLayoutActions.updateRepeatingGroupsEditIndexFulfilled({
          group,
          index,
        }),
      );
    }
  } catch (error) {
    yield put(
      FormLayoutActions.updateRepeatingGroupsEditIndexRejected({ error }),
    );
  }
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
    return (
      currentGroups[key].index > -1 &&
      (!newGroups[key] || newGroups[key].index === -1)
    );
  });
  if (groupsToRemoveValidations.length > 0) {
    let validations = state.formValidations.validations;
    for (const group of groupsToRemoveValidations) {
      for (let i = 0; i <= currentGroups[group].index; i++) {
        validations = removeGroupValidationsByIndex(
          group,
          i,
          state.formLayout.uiConfig.currentView,
          layouts,
          currentGroups,
          validations,
          false,
        );
      }
    }
    yield put(ValidationActions.updateValidations({ validations }));
  }
  // preserve current edit index if still valid
  currentGroupKeys
    .filter((key) => !groupsToRemoveValidations.includes(key))
    .forEach((key) => {
      if (newGroups[key]?.index >= currentGroups[key].editIndex) {
        newGroups[key].editIndex = currentGroups[key].editIndex;
      }
    });
  yield put(
    FormLayoutActions.updateRepeatingGroupsFulfilled({
      repeatingGroups: newGroups,
    }),
  );
}

export function* watchInitRepeatingGroupsSaga(): SagaIterator {
  yield take(FormLayoutActions.fetchFulfilled);
  yield call(initRepeatingGroupsSaga);
  yield takeLatest(
    [
      FormDataActions.fetchFulfilled,
      FormLayoutActions.initRepeatingGroups,
      FormLayoutActions.fetchFulfilled,
    ],
    initRepeatingGroupsSaga,
  );
}

export function* updateFileUploaderWithTagEditIndexSaga({
  payload: { componentId, baseComponentId, index, attachmentId = null },
}: PayloadAction<IUpdateFileUploaderWithTagEditIndex>): SagaIterator {
  try {
    if (attachmentId && index === -1) {
      // In the case of closing an edit view.
      const state: IRuntimeState = yield select();
      const chosenOption =
        state.formLayout.uiConfig.fileUploadersWithTag[componentId]
          .chosenOptions[attachmentId];
      if (chosenOption && chosenOption !== '') {
        yield put(
          FormLayoutActions.updateFileUploaderWithTagEditIndexFulfilled({
            componentId,
            baseComponentId,
            index,
          }),
        );
      } else {
        yield put(
          FormLayoutActions.updateFileUploaderWithTagEditIndexRejected({
            error: null,
          }),
        );
      }
    } else {
      yield put(
        FormLayoutActions.updateFileUploaderWithTagEditIndexFulfilled({
          componentId,
          baseComponentId,
          index,
        }),
      );
    }
  } catch (error) {
    yield put(
      FormLayoutActions.updateFileUploaderWithTagEditIndexRejected({ error }),
    );
  }
}

export function* updateFileUploaderWithTagChosenOptionsSaga({
  payload: { componentId, baseComponentId, id, option },
}: PayloadAction<IUpdateFileUploaderWithTagChosenOptions>): SagaIterator {
  try {
    // Validate option to available options
    const state: IRuntimeState = yield select();
    const currentView = state.formLayout.uiConfig.currentView;
    const component = state.formLayout.layouts[currentView].find(
      (component: ILayoutComponent) => component.id === baseComponentId,
    ) as ILayoutCompFileUploadWithTag;
    const componentOptions =
      state.optionState.options[
        getOptionLookupKey(component.optionsId, component.mapping)
      ]?.options;
    if (componentOptions.find((op) => op.value === option.value)) {
      yield put(
        FormLayoutActions.updateFileUploaderWithTagChosenOptionsFulfilled({
          componentId,
          baseComponentId,
          id,
          option,
        }),
      );
    } else {
      yield put(
        FormLayoutActions.updateFileUploaderWithTagChosenOptionsRejected({
          error: new Error('Could not find the selected option!'),
        }),
      );
    }
  } catch (error) {
    yield put(
      FormLayoutActions.updateFileUploaderWithTagChosenOptionsRejected({
        error,
      }),
    );
  }
}

export function* mapFileUploaderWithTagSaga(): SagaIterator {
  const attachmentState: IAttachmentState = yield select(selectAttachmentState);
  const layouts = yield select(selectFormLayouts);
  let newUploads: IFileUploadersWithTag = {};
  Object.keys(layouts).forEach((layoutKey: string) => {
    newUploads = {
      ...newUploads,
      ...mapFileUploadersWithTag(layouts[layoutKey], attachmentState),
    };
  });
  yield put(
    FormLayoutActions.updateFileUploadersWithTagFulfilled({
      uploaders: newUploads,
    }),
  );
}

export function* watchMapFileUploaderWithTagSaga(): SagaIterator {
  yield all([
    take(FormLayoutActions.fetchFulfilled),
    take(AttachmentActions.mapAttachmentsFulfilled),
  ]);
  yield call(mapFileUploaderWithTagSaga);

  yield takeLatest(
    [
      AttachmentActions.mapAttachmentsFulfilled,
      FormLayoutActions.fetchFulfilled,
    ],
    mapFileUploaderWithTagSaga,
  );
}

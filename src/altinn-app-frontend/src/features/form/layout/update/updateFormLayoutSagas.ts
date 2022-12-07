import { all, call, put, race, select, take, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { selectLayoutOrder } from 'src/selectors/getLayoutOrder';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import { OptionsActions } from 'src/shared/resources/options/optionsSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { Triggers } from 'src/types';
import {
  getCurrentDataTypeForApplication,
  getCurrentDataTypeId,
  getCurrentTaskDataElementId,
  isStatelessApp,
} from 'src/utils/appMetadata';
import { getCalculatePageOrderUrl, getDataValidationUrl } from 'src/utils/appUrlHelper';
import { shiftAttachmentRowInRepeatingGroup } from 'src/utils/attachment';
import { convertDataBindingToModel, findChildAttachments, removeGroupData } from 'src/utils/databindings';
import {
  findChildren,
  getRepeatingGroupFilteredIndices,
  getRepeatingGroups,
  mapFileUploadersWithTag,
  removeRepeatingGroupFromUIConfig,
  splitDashedKey,
} from 'src/utils/formLayout';
import { getLayoutsetForDataElement } from 'src/utils/layout';
import { getOptionLookupKey, removeGroupOptionsByIndex } from 'src/utils/options';
import { waitFor } from 'src/utils/sagas';
import {
  canFormBeSaved,
  mapDataElementValidationToRedux,
  mergeValidationObjects,
  removeGroupValidationsByIndex,
  runClientSideValidation,
  validateGroup,
} from 'src/utils/validation';
import { filterValidationsByRow } from 'src/utils/validation/validation';
import type { IFormDataState } from 'src/features/form/data';
import type {
  ILayoutCompFileUploadWithTag,
  ILayoutComponent,
  ILayoutComponentOrGroup,
  ILayoutGroup,
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
  IOptions,
  IRepeatingGroups,
  IRuntimeState,
  IValidationIssue,
  IValidations,
} from 'src/types';

import { get, post } from 'altinn-shared/utils';

export const selectFormLayoutState = (state: IRuntimeState) => state.formLayout;
export const selectFormData = (state: IRuntimeState) => state.formData;
export const selectFormLayouts = (state: IRuntimeState) => state.formLayout.layouts;
export const selectAttachmentState = (state: IRuntimeState) => state.attachments;
export const selectValidations = (state: IRuntimeState) => state.formValidations.validations;
export const selectOptions = (state: IRuntimeState) => state.optionState.options;
export const selectAllLayouts = (state: IRuntimeState) => state.formLayout.uiConfig.tracks.order;
export const selectCurrentLayout = (state: IRuntimeState) => state.formLayout.uiConfig.currentView;

export function* updateRepeatingGroupsSaga({
  payload: { layoutElementId, remove, index },
}: PayloadAction<IUpdateRepeatingGroups>): SagaIterator {
  try {
    const formLayoutState: ILayoutState = yield select(selectFormLayoutState);
    const repeatingGroups = formLayoutState.uiConfig.repeatingGroups;
    if (!repeatingGroups) {
      throw new Error('Repeating groups not set');
    }
    const layouts = formLayoutState.layouts;
    if (!layouts) {
      throw new Error('Layouts not set');
    }
    const currentLayout = layouts[formLayoutState.uiConfig.currentView];
    if (!currentLayout) {
      throw new Error('Current layout not set');
    }

    const currentIndex = repeatingGroups[layoutElementId]?.index ?? -1;
    const newIndex = remove ? currentIndex - 1 : currentIndex + 1;
    let updatedRepeatingGroups: IRepeatingGroups = {
      ...repeatingGroups,
      [layoutElementId]: {
        ...repeatingGroups[layoutElementId],
        index: newIndex,
      },
    };

    const groupContainer = currentLayout.find((element) => element.id === layoutElementId) as ILayoutGroup | undefined;

    const children = groupContainer?.children || [];
    const childGroups: (ILayoutGroup | ILayoutComponent)[] = currentLayout.filter((element) => {
      if (element.type !== 'Group') {
        return false;
      }

      if (groupContainer?.edit?.multiPage) {
        return children.find((c) => c.split(':')[1] === element.id);
      }

      return children?.indexOf(element.id) > -1;
    });

    childGroups?.forEach((group: ILayoutGroup) => {
      if (remove && typeof index === 'number') {
        updatedRepeatingGroups = removeRepeatingGroupFromUIConfig(updatedRepeatingGroups, group.id, index, true);
      } else {
        const groupId = `${group.id}-${newIndex}`;
        updatedRepeatingGroups[groupId] = {
          index: -1,
          baseGroupId: group.id,
          dataModelBinding: group.dataModelBindings?.group,
          editIndex: -1,
          multiPageIndex: -1,
        };
      }
    });

    if (remove && typeof index === 'number') {
      const formDataState: IFormDataState = yield select(selectFormData);
      const attachments: IAttachmentState = yield select(selectAttachmentState);
      const validations: IValidations = yield select(selectValidations);
      const options: IOptions = yield select(selectOptions);
      const repeatingGroup = repeatingGroups[layoutElementId];

      // Find uploaded attachments inside group and delete them
      const childAttachments = findChildAttachments(
        formDataState.formData,
        attachments.attachments,
        currentLayout,
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
          const attachmentId = completion.fulfilled?.payload.attachmentId || completion.rejected?.payload.attachment.id;
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
        const attachments: IAttachmentState = yield select(selectAttachmentState);
        const splitLayoutElementId = splitDashedKey(layoutElementId);
        const childFileUploaders = findChildren(currentLayout, {
          matching: (c) => c.type === 'FileUpload' || c.type === 'FileUploadWithTag',
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
          currentLayout,
          layoutElementId,
          repeatingGroup,
        );

        // Remove the validations associated with the group
        const updatedValidations = removeGroupValidationsByIndex(
          layoutElementId,
          index,
          formLayoutState.uiConfig.currentView,
          layouts,
          repeatingGroups,
          validations,
        );
        yield put(
          ValidationActions.updateValidations({
            validations: updatedValidations,
          }),
        );

        // Remove options associated with the group
        const updatedOptions = removeGroupOptionsByIndex({
          groupId: layoutElementId,
          index,
          repeatingGroups,
          options,
          layout: currentLayout,
        });
        yield put(OptionsActions.setOptions({ options: updatedOptions }));

        updatedRepeatingGroups[layoutElementId].deletingIndex = updatedRepeatingGroups[
          layoutElementId
        ].deletingIndex?.filter((value) => value !== index);
        updatedRepeatingGroups[layoutElementId].editIndex = -1;

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
        yield put(FormDataActions.save({}));
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
  payload: { newView, runValidations, returnToView, skipPageCaching, keepScrollPos, focusComponentId },
}: PayloadAction<IUpdateCurrentView>): SagaIterator {
  try {
    // When triggering navigation to the next page, we need to make sure there are no unsaved changes. The action to
    // save it should be triggered elsewhere, but we should wait until the state settles before navigating.
    yield waitFor((state) => !state.formData.unsavedChanges);

    const state: IRuntimeState = yield select();
    const visibleLayouts: string[] | null = yield select(selectLayoutOrder);
    const viewCacheKey = state.formLayout.uiConfig.currentViewCacheKey;
    const instanceId = state.instanceData.instance?.id;
    if (!viewCacheKey) {
      yield put(FormLayoutActions.setCurrentViewCacheKey({ key: instanceId }));
    }
    const currentViewCacheKey = viewCacheKey || instanceId;

    if (visibleLayouts && !visibleLayouts.includes(newView)) {
      yield put(
        FormLayoutActions.updateCurrentViewRejected({
          error: null,
          keepScrollPos,
        }),
      );
      return;
    }

    if (!runValidations) {
      if (!skipPageCaching && currentViewCacheKey) {
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
      const { validationResult, componentSpecificValidations, emptyFieldsValidations } = runClientSideValidation(state);
      const currentView = state.formLayout.uiConfig.currentView;
      const options: AxiosRequestConfig = {
        headers: {
          LayoutId: currentView,
        },
      };
      const currentTaskDataId =
        state.applicationMetadata.applicationMetadata &&
        getCurrentTaskDataElementId(
          state.applicationMetadata.applicationMetadata,
          state.instanceData.instance,
          state.formLayout.layoutsets,
        );
      const layoutState: ILayoutState = state.formLayout;

      const validationOptions = runValidations === 'page' ? options : undefined;
      const serverValidation: IValidationIssue[] | undefined =
        instanceId && currentTaskDataId
          ? yield call(get, getDataValidationUrl(instanceId, currentTaskDataId), validationOptions)
          : undefined;

      // update validation state
      const mappedValidations = mapDataElementValidationToRedux(
        serverValidation,
        layoutState.layouts || {},
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
        if (!skipPageCaching && currentViewCacheKey) {
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
        if (!skipPageCaching && currentViewCacheKey) {
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
    let layoutSetId: string | null = null;
    let dataTypeId: string | null = null;
    const formData = convertDataBindingToModel(state.formData.formData);

    if (!state.applicationMetadata.applicationMetadata) {
      yield put(
        FormLayoutActions.calculatePageOrderAndMoveToNextPageRejected({
          error: null,
        }),
      );
      return;
    }

    const appIsStateless = isStatelessApp(state.applicationMetadata.applicationMetadata);
    if (appIsStateless) {
      dataTypeId =
        getCurrentDataTypeForApplication({
          application: state.applicationMetadata.applicationMetadata,
          layoutSets: state.formLayout.layoutsets || undefined,
        }) || null;
      layoutSetId = state.applicationMetadata.applicationMetadata.onEntry?.show || null;
    } else {
      const instance = state.instanceData.instance;
      dataTypeId =
        getCurrentDataTypeId(state.applicationMetadata.applicationMetadata, instance, state.formLayout.layoutsets) ||
        null;
      if (layoutSets != null) {
        layoutSetId = getLayoutsetForDataElement(instance, dataTypeId || undefined, layoutSets) || null;
      }
    }
    const layoutOrder = yield call(post, getCalculatePageOrderUrl(appIsStateless), formData, {
      params: {
        currentPage: currentView,
        layoutSetId,
        dataTypeId,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    yield put(
      FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled({
        order: layoutOrder,
      }),
    );
    if (skipMoveToNext) {
      return;
    }
    const returnToView = state.formLayout.uiConfig.returnToView;
    const newView = returnToView || layoutOrder[layoutOrder.indexOf(currentView) + 1];
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

/**
 * When hiding one or more pages, we cannot show them - so we'll have to make sure we navigate to the next one
 * in the page order (if currently on a page that is not visible).
 */
export function* findAndMoveToNextVisibleLayout(): SagaIterator {
  const allLayouts: string[] | null = yield select(selectAllLayouts);
  const visibleLayouts: string[] | null = yield select(selectLayoutOrder);
  const current: string = yield select(selectCurrentLayout);

  const possibleLayouts = new Set<string>(allLayouts || []);
  let nextVisiblePage = current;
  while (visibleLayouts && allLayouts && !visibleLayouts.includes(nextVisiblePage)) {
    const nextIndex = allLayouts.findIndex((l) => l === nextVisiblePage) + 1;
    nextVisiblePage = allLayouts[nextIndex];

    // Because findIndex() returns -1 when no item was found, the code above rolls around to index 0, and will
    // start looking at the first page again (which is intentional). However, if the state is broken we might
    // never find the visible layout, causing an infinite loop. This code just makes sure our ship is tight and
    // that loop can't happen.
    possibleLayouts.delete(nextVisiblePage);
    if (!possibleLayouts.size) {
      break;
    }
  }

  if (nextVisiblePage && nextVisiblePage !== current) {
    yield put(
      FormLayoutActions.updateCurrentViewFulfilled({
        newView: nextVisiblePage,
      }),
    );
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
    const layouts = state.formLayout.layouts || {};
    const pageTriggers = state.formLayout.uiConfig.pageTriggers;
    const appHasCalculateTrigger =
      pageTriggers?.includes(Triggers.CalculatePageOrder) ||
      Object.keys(layouts).some((layout) => {
        return layouts[layout]?.some((element: ILayoutComponentOrGroup) => {
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
      yield put(
        FormLayoutActions.calculatePageOrderAndMoveToNextPage({
          skipMoveToNext: true,
        }),
      );
    }
  }
}

export function* updateRepeatingGroupEditIndexSaga({
  payload: { group, index, validate },
}: PayloadAction<IUpdateRepeatingGroupsEditIndex>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const rowIndex = state.formLayout.uiConfig.repeatingGroups?.[group].editIndex;

    if (validate && typeof rowIndex === 'number' && rowIndex > -1) {
      const validations: IValidations = state.formValidations.validations;
      const currentView = state.formLayout.uiConfig.currentView;

      const frontendValidations: IValidations = validateGroup(
        group,
        state,
        validate === Triggers.ValidateRow ? rowIndex : undefined,
      );

      // Get group's rowIndices to send to server for validations
      const { depth: rowIndices } = splitDashedKey(group);
      rowIndices.push(rowIndex);

      const options: AxiosRequestConfig = {
        headers: {
          ComponentId: group,
          RowIndex: rowIndices.join(','),
        },
      };

      if (!state.applicationMetadata.applicationMetadata || !state.instanceData.instance || !state.formLayout.layouts) {
        yield put(
          FormLayoutActions.updateRepeatingGroupsEditIndexRejected({
            error: null,
          }),
        );
        return;
      }

      const currentTaskDataId = getCurrentTaskDataElementId(
        state.applicationMetadata.applicationMetadata,
        state.instanceData.instance,
        state.formLayout.layoutsets,
      );

      if (!currentTaskDataId) {
        yield put(
          FormLayoutActions.updateRepeatingGroupsEditIndexRejected({
            error: null,
          }),
        );
        return;
      }

      const serverValidations: IValidationIssue[] = yield call(
        get,
        getDataValidationUrl(state.instanceData.instance.id, currentTaskDataId),
        options,
      );
      const mappedServerValidations: IValidations = mapDataElementValidationToRedux(
        serverValidations,
        state.formLayout.layouts,
        state.textResources.resources,
      );

      const combinedValidations = mergeValidationObjects(frontendValidations, mappedServerValidations);

      // only overwrite validtions specific to the group - leave all other untouched
      const newValidations = {
        ...validations,
        [currentView]: {
          ...validations[currentView],
          ...combinedValidations[currentView],
        },
      };
      yield put(ValidationActions.updateValidations({ validations: newValidations }));

      const rowValidations = filterValidationsByRow(
        combinedValidations,
        state.formLayout.layouts[currentView],
        state.formLayout.uiConfig.repeatingGroups,
        group,
        rowIndex,
      );
      if (canFormBeSaved({ validations: rowValidations, invalidDataTypes: false }, 'Complete')) {
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
    yield put(FormLayoutActions.updateRepeatingGroupsEditIndexRejected({ error }));
  }
}

export function* initRepeatingGroupsSaga(): SagaIterator {
  const formDataState: IFormDataState = yield select(selectFormData);
  const state: IRuntimeState = yield select();
  const currentGroups = state.formLayout.uiConfig.repeatingGroups || {};
  const layouts = yield select(selectFormLayouts);
  let newGroups: IRepeatingGroups = {};
  Object.keys(layouts).forEach((layoutKey: string) => {
    newGroups = {
      ...newGroups,
      ...getRepeatingGroups(layouts[layoutKey], formDataState.formData),
    };
  });
  // if any groups have been removed as part of calculation we delete the associated validations
  const currentGroupKeys = Object.keys(currentGroups);
  const groupsToRemoveValidations = currentGroupKeys.filter((key) => {
    return currentGroups[key].index > -1 && (!newGroups[key] || newGroups[key].index === -1);
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

  // Open by default
  const newGroupKeys = Object.keys(newGroups || {});
  const groupContainers = Object.values(state.formLayout.layouts || {})
    .flatMap((e) => e)
    .filter((e) => e && e.type === 'Group') as ILayoutGroup[];

  newGroupKeys.forEach((key) => {
    const group = newGroups[key];
    const container = groupContainers.find((element) => element.id === key) as ILayoutGroup;
    if (container && group.index >= 0) {
      const filteredIndexList = getRepeatingGroupFilteredIndices(formDataState.formData, container.edit?.filter);

      if (container.edit?.openByDefault === 'first') {
        group.editIndex = filteredIndexList ? filteredIndexList[0] : 0;
      } else if (container.edit?.openByDefault === 'last') {
        group.editIndex = filteredIndexList ? filteredIndexList.at(-1) : group.index;
      }
    }
  });

  // preserve current edit and multipage index if still valid
  currentGroupKeys
    .filter((key) => newGroups[key] !== undefined)
    .forEach((key) => {
      const currentGroup = currentGroups[key];
      const newGroup = newGroups[key];
      if (currentGroup.editIndex !== undefined && newGroup.index >= currentGroup.editIndex) {
        newGroup.editIndex = currentGroups[key].editIndex;
      }
      if (currentGroup.multiPageIndex !== undefined) {
        newGroup.multiPageIndex = currentGroup.multiPageIndex;
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
    [FormDataActions.fetchFulfilled, FormLayoutActions.initRepeatingGroups, FormLayoutActions.fetchFulfilled],
    initRepeatingGroupsSaga,
  );
}

export function* updateFileUploaderWithTagEditIndexSaga({
  payload: { componentId, baseComponentId, index, attachmentId },
}: PayloadAction<IUpdateFileUploaderWithTagEditIndex>): SagaIterator {
  try {
    if (attachmentId && index === -1) {
      // In the case of closing an edit view.
      const state: IRuntimeState = yield select();
      const chosenOption =
        state.formLayout.uiConfig.fileUploadersWithTag &&
        state.formLayout.uiConfig.fileUploadersWithTag[componentId]?.chosenOptions[attachmentId];
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
    yield put(FormLayoutActions.updateFileUploaderWithTagEditIndexRejected({ error }));
  }
}

export function* updateFileUploaderWithTagChosenOptionsSaga({
  payload: { componentId, baseComponentId, id, option },
}: PayloadAction<IUpdateFileUploaderWithTagChosenOptions>): SagaIterator {
  try {
    // Validate option to available options
    const state: IRuntimeState = yield select();
    const currentView = state.formLayout.uiConfig.currentView;
    const component =
      state.formLayout.layouts &&
      (state.formLayout.layouts[currentView]?.find((component) => component.id === baseComponentId) as
        | ILayoutCompFileUploadWithTag
        | undefined);
    const lookupKey =
      component &&
      getOptionLookupKey({
        id: component?.optionsId,
        mapping: component?.mapping,
      });
    const componentOptions = typeof lookupKey === 'string' && state.optionState.options[lookupKey]?.options;
    if (componentOptions && componentOptions.find((op) => op.value === option.value)) {
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
  yield all([take(FormLayoutActions.fetchFulfilled), take(AttachmentActions.mapAttachmentsFulfilled)]);
  yield call(mapFileUploaderWithTagSaga);

  yield takeLatest(
    [AttachmentActions.mapAttachmentsFulfilled, FormLayoutActions.fetchFulfilled],
    mapFileUploaderWithTagSaga,
  );
}

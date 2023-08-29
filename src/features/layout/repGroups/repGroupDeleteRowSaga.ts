import { put, race, select, take } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import {
  selectAttachmentState,
  selectFormData,
  selectFormLayoutState,
  selectOptions,
} from 'src/features/layout/update/updateFormLayoutSagas';
import { OptionsActions } from 'src/features/options/optionsSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { groupIsRepeatingExt } from 'src/layout/Group/tools';
import { shiftAttachmentRowInRepeatingGroup } from 'src/utils/attachment';
import { findChildAttachments, removeGroupData } from 'src/utils/databindings';
import { findChildren, removeRepeatingGroupFromUIConfig, splitDashedKey } from 'src/utils/formLayout';
import { ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import { removeGroupOptionsByIndex } from 'src/utils/options';
import { createLayoutValidationResult, emptyValidation } from 'src/utils/validation/validationHelpers';
import type { IAttachmentState } from 'src/features/attachments';
import type {
  IDeleteAttachmentActionFulfilled,
  IDeleteAttachmentActionRejected,
} from 'src/features/attachments/delete/deleteAttachmentActions';
import type { IFormData } from 'src/features/formData';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';
import type { IRepGroupDelRow } from 'src/features/layout/formLayoutTypes';
import type { CompGroupExternal } from 'src/layout/Group/config.generated';
import type { IOptions, IRepeatingGroups } from 'src/types';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

export function* repGroupDeleteRowSaga({ payload: { groupId, index } }: PayloadAction<IRepGroupDelRow>): SagaIterator {
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

    const currentIndex = repeatingGroups[groupId]?.index ?? -1;
    const newIndex = currentIndex - 1;
    let updatedRepeatingGroups: IRepeatingGroups = {
      ...repeatingGroups,
      [groupId]: {
        ...repeatingGroups[groupId],
        index: newIndex,
      },
    };

    const groupContainer = currentLayout.find((element) => element.id === groupId) as CompGroupExternal | undefined;
    const children = groupContainer?.children || [];
    const childGroups = currentLayout.filter((element) => {
      if (element.type !== 'Group') {
        return false;
      }

      if (groupContainer && groupIsRepeatingExt(groupContainer) && groupContainer?.edit?.multiPage) {
        return children.find((c) => c.split(':')[1] === element.id);
      }

      return children?.indexOf(element.id) > -1;
    });

    childGroups?.forEach((group) => {
      updatedRepeatingGroups = removeRepeatingGroupFromUIConfig(updatedRepeatingGroups, group.id, index, true);
    });

    const formData: IFormData = yield select(selectFormData);
    const attachments: IAttachmentState = yield select(selectAttachmentState);
    const options: IOptions = yield select(selectOptions);
    const repeatingGroup = repeatingGroups[groupId];

    // Find uploaded attachments inside group and delete them
    const childAttachments = findChildAttachments(
      formData,
      attachments.attachments,
      currentLayout,
      groupId,
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
          dataModelBindings: undefined,
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
      const splitLayoutElementId = splitDashedKey(groupId);
      const childFileUploaders = findChildren(currentLayout, {
        matching: (c) => c.type === 'FileUpload' || c.type === 'FileUploadWithTag',
        rootGroupId: splitLayoutElementId.baseComponentId,
      });
      const updatedAttachments = shiftAttachmentRowInRepeatingGroup(
        attachments.attachments,
        childFileUploaders,
        groupId,
        index,
      );

      // Remove the form data associated with the group
      const updatedFormData = removeGroupData(formData, index, currentLayout, groupId, repeatingGroup);

      // Remove the validations associated with the group
      const resolvedNodes: LayoutPages = yield select(ResolvedNodesSelector);
      const groupNode = resolvedNodes.findById(groupId);
      if (groupNode) {
        const children = groupNode.flat(true, index).filter((node) => node.item.id !== groupId);
        const validationObjects = children.map((child) => emptyValidation(child));
        const validationResult = createLayoutValidationResult(validationObjects);
        yield put(
          ValidationActions.updateLayoutValidation({
            pageKey: groupNode.pageKey(),
            validationResult,
            merge: true,
          }),
        );
      }

      // Remove options associated with the group
      const updatedOptions = removeGroupOptionsByIndex({
        groupId,
        index,
        repeatingGroups,
        options,
        layout: currentLayout,
      });
      yield put(OptionsActions.setOptions({ options: updatedOptions }));

      updatedRepeatingGroups[groupId].deletingIndex = updatedRepeatingGroups[groupId].deletingIndex?.filter(
        (value) => value !== index,
      );
      updatedRepeatingGroups[groupId].editIndex = -1;

      yield put(FormLayoutActions.repGroupDeleteRowFulfilled({ updated: updatedRepeatingGroups }));
      yield put(FormDataActions.setFulfilled({ formData: updatedFormData }));
      yield put(AttachmentActions.mapAttachmentsFulfilled({ attachments: updatedAttachments }));
      yield put(FormDataActions.saveEvery({}));
    } else {
      yield put(FormLayoutActions.repGroupDeleteRowCancelled({ groupId, index }));
    }
  } catch (error) {
    yield put(FormLayoutActions.repGroupDeleteRowRejected({ error }));
    window.logError(`Deleting row from repeating group (${groupId}) failed:\n`, error);
  }
}

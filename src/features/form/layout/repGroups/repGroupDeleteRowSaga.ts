import { put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { selectFormData, selectFormLayoutState } from 'src/features/form/layout/update/updateFormLayoutSagas';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { groupIsRepeatingExt } from 'src/layout/Group/tools';
import { removeGroupData } from 'src/utils/databindings';
import { removeRepeatingGroupFromUIConfig } from 'src/utils/formLayout';
import { ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import { createLayoutValidationResult, emptyValidation } from 'src/utils/validation/validationHelpers';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
import type { IRepGroupDelRow } from 'src/features/form/layout/formLayoutTypes';
import type { IFormData } from 'src/features/formData';
import type { CompGroupExternal } from 'src/layout/Group/config.generated';
import type { IRepeatingGroups } from 'src/types';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

export function* repGroupDeleteRowSaga({
  payload: { groupId, index, currentPageId },
}: PayloadAction<IRepGroupDelRow>): SagaIterator {
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
    if (!currentPageId) {
      throw new Error('No current page id set');
    }
    const currentLayout = layouts[currentPageId];
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
    const repeatingGroup = repeatingGroups[groupId];

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

    updatedRepeatingGroups[groupId].deletingIndex = updatedRepeatingGroups[groupId].deletingIndex?.filter(
      (value) => value !== index,
    );
    updatedRepeatingGroups[groupId].editIndex = -1;

    yield put(FormLayoutActions.repGroupDeleteRowFulfilled({ updated: updatedRepeatingGroups }));
    yield put(FormDataActions.setFulfilled({ formData: updatedFormData }));
    yield put(FormDataActions.saveEvery({}));
  } catch (error) {
    window.logError(`Deleting row from repeating group (${groupId}) failed:\n`, error);
  }
}

import { put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormDynamicsActions } from 'src/features/dynamics/formDynamicsSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { selectFormLayoutState } from 'src/features/layout/update/updateFormLayoutSagas';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { IRepeatingGroups } from 'src/types';

export function* repGroupAddRowSaga({ payload: { groupId } }: PayloadAction<{ groupId: string }>): SagaIterator {
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
    const newIndex = currentIndex + 1;
    const updatedRepeatingGroups: IRepeatingGroups = {
      ...repeatingGroups,
      [groupId]: {
        ...repeatingGroups[groupId],
        index: newIndex,
      },
    };

    const groupContainer = currentLayout.find((element) => element.id === groupId) as ILayoutGroup | undefined;
    const children = groupContainer?.children || [];
    const childGroups = currentLayout.filter((element) => {
      if (element.type !== 'Group') {
        return false;
      }

      if (groupContainer?.edit?.multiPage) {
        return children.find((c) => c.split(':')[1] === element.id);
      }

      return children?.indexOf(element.id) > -1;
    });

    childGroups?.forEach((group) => {
      const groupId = `${group.id}-${newIndex}`;
      updatedRepeatingGroups[groupId] = {
        index: -1,
        baseGroupId: group.id,
        dataModelBinding: group.dataModelBindings?.group,
        editIndex: -1,
        multiPageIndex: -1,
      };
    });

    yield put(FormLayoutActions.repGroupAddRowFulfilled({ updated: updatedRepeatingGroups }));
    yield put(FormDynamicsActions.checkIfConditionalRulesShouldRun({}));
  } catch (error) {
    yield put(FormLayoutActions.repGroupAddRowRejected({ error }));
  }
}

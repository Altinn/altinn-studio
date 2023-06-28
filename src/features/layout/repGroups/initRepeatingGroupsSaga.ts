import { put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { selectFormData, selectFormLayouts } from 'src/features/layout/update/updateFormLayoutSagas';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { getRepeatingGroupFilteredIndices, getRepeatingGroups } from 'src/utils/formLayout';
import { selectNotNull } from 'src/utils/sagas';
import { removeGroupValidationsByIndex } from 'src/utils/validation/validation';
import type { IFormDataState } from 'src/features/formData';
import type { IInitRepeatingGroups } from 'src/features/layout/formLayoutTypes';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { IRepeatingGroups, IRuntimeState } from 'src/types';

export function* initRepeatingGroupsSaga({
  payload: { changedFields },
}: Pick<PayloadAction<IInitRepeatingGroups>, 'payload'>): SagaIterator {
  const layouts = yield selectNotNull(selectFormLayouts);
  const formDataState: IFormDataState = yield select(selectFormData);
  const state: IRuntimeState = yield select();
  const currentGroups = state.formLayout.uiConfig.repeatingGroups || {};
  let newGroups: IRepeatingGroups = {};
  Object.keys(layouts).forEach((layoutKey: string) => {
    newGroups = {
      ...newGroups,
      ...getRepeatingGroups(layouts[layoutKey], formDataState.formData),
    };
  });
  // if any groups have been removed as part of calculation we delete the associated validations
  const currentGroupKeys = Object.keys(currentGroups);
  const groupsToRemoveValidations = currentGroupKeys.filter(
    (key) => currentGroups[key].index > -1 && (!newGroups[key] || newGroups[key].index === -1),
  );
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

      // We add +1 to the index because it's entirely valid (and common) to be editing the last row in a group (bacause
      // that's what happens when you click the 'add' button). If we didn't add +1 here, the user could be editing the
      // last row in a group, and a server-sent change could cause the editing mode to disappear.
      if (currentGroup.editIndex !== undefined && newGroup.index + 1 >= currentGroup.editIndex) {
        newGroup.editIndex = currentGroup.editIndex;
      }

      if (currentGroup.multiPageIndex !== undefined) {
        newGroup.multiPageIndex = currentGroup.multiPageIndex;
      }

      const dmBinding = newGroup.dataModelBinding;
      const changesInThisGroup = dmBinding && Object.keys(changedFields || {}).some((key) => key.startsWith(dmBinding));

      if (currentGroup.index > newGroup.index && !changesInThisGroup) {
        // A user might have clicked the 'add' button multiple times without having started to fill out every new row
        // yet. We need to preserve the index of the last row that was added so that the user can continue to fill out
        // the form from where they left off. If, however, the server changed something in our group, they might
        // also have deleted rows. In that case we need to reset the index to the last row.
        newGroup.index = currentGroup.index;
      }
    });
  yield put(FormLayoutActions.initRepeatingGroupsFulfilled({ updated: newGroups }));
}

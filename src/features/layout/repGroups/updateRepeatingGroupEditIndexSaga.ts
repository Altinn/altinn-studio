import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig } from 'axios/index';
import type { SagaIterator } from 'redux-saga';

import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { Triggers } from 'src/types';
import { getCurrentTaskDataElementId } from 'src/utils/appMetadata';
import { splitDashedKey } from 'src/utils/formLayout';
import { ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { getDataValidationUrl } from 'src/utils/urls/appUrlHelper';
import {
  canFormBeSaved,
  filterValidationsByRow,
  mapDataElementValidationToRedux,
  mergeValidationObjects,
  validateGroup,
} from 'src/utils/validation/validation';
import type { IUpdateRepeatingGroupsEditIndex } from 'src/features/layout/formLayoutTypes';
import type { IRuntimeState, IValidationIssue, IValidations } from 'src/types';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

export function* updateRepeatingGroupEditIndexSaga({
  payload: { group, index, validate, shouldAddRow },
}: PayloadAction<IUpdateRepeatingGroupsEditIndex>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const resolvedNodes: LayoutPages = yield select(ResolvedNodesSelector);
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
            group,
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
            group,
          }),
        );
        return;
      }

      const serverValidations: IValidationIssue[] = yield call(
        httpGet,
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
      const rowValidations = filterValidationsByRow(resolvedNodes, combinedValidations, group, rowIndex);

      if (canFormBeSaved({ validations: rowValidations, invalidDataTypes: false })) {
        if (shouldAddRow) {
          yield put(FormLayoutActions.repGroupAddRow({ groupId: group }));
        }
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
            group,
          }),
        );
      }
    } else {
      if (shouldAddRow) {
        yield put(FormLayoutActions.repGroupAddRow({ groupId: group }));
      }
      yield put(
        FormLayoutActions.updateRepeatingGroupsEditIndexFulfilled({
          group,
          index,
        }),
      );
    }
  } catch (error) {
    yield put(FormLayoutActions.updateRepeatingGroupsEditIndexRejected({ error, group }));
  }
}

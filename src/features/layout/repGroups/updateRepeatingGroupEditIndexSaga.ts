import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig } from 'axios/index';
import type { SagaIterator } from 'redux-saga';

import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
import { Triggers } from 'src/layout/common.generated';
import { getCurrentTaskDataElementId } from 'src/utils/appMetadata';
import { ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { getDataValidationUrl } from 'src/utils/urls/appUrlHelper';
import { mapValidationIssues } from 'src/utils/validation/backendValidation';
import {
  containsErrors,
  createLayoutValidationResult,
  filterValidationObjectsByRowIndex,
  validationContextFromState,
} from 'src/utils/validation/validationHelpers';
import type { IUpdateRepeatingGroupsEditIndex } from 'src/features/layout/formLayoutTypes';
import type { IRuntimeState } from 'src/types';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { BackendValidationIssue } from 'src/utils/validation/types';

export function* updateRepeatingGroupEditIndexSaga({
  payload: { group, index, validate, shouldAddRow },
}: PayloadAction<IUpdateRepeatingGroupsEditIndex>): SagaIterator {
  try {
    const state: IRuntimeState = yield select();
    const resolvedNodes: LayoutPages = yield select(ResolvedNodesSelector);
    const rowIndex = state.formLayout.uiConfig.repeatingGroups?.[group].editIndex;
    const groupNode = resolvedNodes.findById(group);

    if (validate && groupNode?.isType('Group') && typeof rowIndex === 'number' && rowIndex > -1) {
      const frontendValidationObjects = groupNode.def.runGroupValidations(
        groupNode,
        (node) => validationContextFromState(state, node),
        validate === Triggers.ValidateRow ? rowIndex : undefined,
      );

      // Get group's rowIndices to send to server for validations
      const rowIndices = groupNode.getRowIndices();
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

      const serverValidations: BackendValidationIssue[] = yield call(
        httpGet,
        getDataValidationUrl(state.instanceData.instance.id, currentTaskDataId),
        options,
      );
      const serverValidationObjects = mapValidationIssues(
        serverValidations,
        resolvedNodes,
        staticUseLanguageFromState(state),
      );

      const validationObjects = [...frontendValidationObjects, ...serverValidationObjects];
      const validationResult = createLayoutValidationResult(validationObjects);
      yield put(
        ValidationActions.updateLayoutValidation({ validationResult, pageKey: groupNode.pageKey(), merge: true }),
      );
      const rowValidations = filterValidationObjectsByRowIndex(rowIndex, groupNode.getRowIndices(), validationObjects);

      if (!containsErrors(rowValidations)) {
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
    window.logError(`Updating edit index for repeating group (${group}) failed:\n`, error);
  }
}

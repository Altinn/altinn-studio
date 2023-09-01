import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AxiosRequestConfig } from 'axios';
import type { SagaIterator } from 'redux-saga';

import { ValidationActions } from 'src/features/validation/validationSlice';
import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
import { getCurrentTaskDataElementId } from 'src/utils/appMetadata';
import { ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import { httpGet } from 'src/utils/network/networking';
import { getDataValidationUrl } from 'src/utils/urls/appUrlHelper';
import { mapValidationIssues } from 'src/utils/validation/backendValidation';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IRunSingleFieldValidation } from 'src/features/validation/validationSlice';
import type { ILayoutSets, IRuntimeState } from 'src/types';
import type { IInstance } from 'src/types/shared';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { BackendValidationIssue } from 'src/utils/validation/types';

export const selectApplicationMetadataState = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
export const selectInstanceState = (state: IRuntimeState) => state.instanceData.instance;
export const selectLayoutSetsState = (state: IRuntimeState) => state.formLayout.layoutsets;
export const selectHiddenFieldsState = (state: IRuntimeState) => state.formLayout.uiConfig.hiddenFields;

export function* runSingleFieldValidationSaga({
  payload: { componentId, dataModelBinding },
}: PayloadAction<IRunSingleFieldValidation>): SagaIterator {
  // Reject validation if field is hidden
  let hiddenFields: string[] = yield select(selectHiddenFieldsState);
  if (hiddenFields.includes(componentId)) {
    yield put(ValidationActions.runSingleFieldValidationRejected({}));
    return;
  }
  const state: IRuntimeState = yield select();
  const resolvedNodes: LayoutPages = yield select(ResolvedNodesSelector);
  const node = resolvedNodes.findById(componentId);

  const applicationMetadata: IApplicationMetadata = yield select(selectApplicationMetadataState);
  const instance: IInstance = yield select(selectInstanceState);
  const layoutSets: ILayoutSets = yield select(selectLayoutSetsState);

  const currentTaskDataId: string | undefined =
    applicationMetadata && getCurrentTaskDataElementId(applicationMetadata, instance, layoutSets);
  const url: string | undefined = instance && currentTaskDataId && getDataValidationUrl(instance.id, currentTaskDataId);

  if (node && url && dataModelBinding) {
    const options: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: dataModelBinding,
      },
    };

    try {
      const serverValidations: BackendValidationIssue[] = yield call(httpGet, url, options);
      const validationObjects = mapValidationIssues(
        serverValidations,
        resolvedNodes,
        staticUseLanguageFromState(state),
      );

      // Reject validation if field has been set to hidden in the time after we sent the validation request
      hiddenFields = yield select(selectHiddenFieldsState);
      if (hiddenFields.includes(componentId)) {
        yield put(ValidationActions.runSingleFieldValidationRejected({}));
        return;
      }

      yield put(ValidationActions.addValidations({ validationObjects }));
    } catch (error) {
      yield put(ValidationActions.runSingleFieldValidationRejected({ error }));
      window.logError('Single field validation failed:\n', error);
    }
  }
}

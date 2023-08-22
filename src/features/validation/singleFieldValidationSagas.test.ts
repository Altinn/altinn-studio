import { call, select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { throwError } from 'redux-saga-test-plan/providers';
import type { AxiosRequestConfig } from 'axios';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import {
  runSingleFieldValidationSaga,
  selectApplicationMetadataState,
  selectHiddenFieldsState,
  selectInstanceState,
  selectLayoutSetsState,
  selectLayoutsState,
  selectValidationsState,
} from 'src/features/validation/singleFieldValidationSagas';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
import { resolvedLayoutsFromState, ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import { httpGet } from 'src/utils/network/networking';
import { getDataValidationUrl } from 'src/utils/urls/appUrlHelper';
import { BackendValidationSeverity } from 'src/utils/validation/backendValidationSeverity';
import type { IRuntimeState } from 'src/types';
import type { BackendValidationIssue, IValidationObject } from 'src/utils/validation/types';

describe('singleFieldValidationSagas', () => {
  let mockState: IRuntimeState;
  const mockTriggerField = 'mockField';
  const mockErrorMessage = 'This is wrong';

  beforeEach(() => {
    mockState = getInitialStateMock();
  });

  it('runSingleFieldValidationSaga, single field validation is triggered', () => {
    const instance = mockState.instanceData.instance;
    if (!instance) {
      throw new Error('Invalid mockState');
    }
    const url = getDataValidationUrl(instance.id, instance.data[0].id);
    const options: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: mockTriggerField,
      },
    };

    const validationIssues: BackendValidationIssue[] = [
      {
        code: 'error',
        description: mockErrorMessage,
        field: 'Group.prop1',
        scope: null,
        severity: BackendValidationSeverity.Error,
        targetId: '',
      },
    ];
    const validationError: IValidationObject = {
      empty: false,
      componentId: 'field1',
      pageKey: 'FormLayout',
      bindingKey: 'simpleBinding',
      severity: 'errors',
      message: mockErrorMessage,
      invalidDataTypes: false,
      rowIndices: [],
    };

    return expectSaga(runSingleFieldValidationSaga, {
      type: '',
      payload: {
        dataModelBinding: mockTriggerField,
        layoutId: 'FormLayout',
        componentId: 'field1',
      },
    })
      .provide([
        [select(), mockState],
        [select(selectApplicationMetadataState), mockState.applicationMetadata.applicationMetadata],
        [select(selectLayoutsState), mockState.formLayout.layouts],
        [select(selectHiddenFieldsState), mockState.formLayout.uiConfig.hiddenFields],
        [select(selectInstanceState), mockState.instanceData.instance],
        [select(selectLayoutSetsState), mockState.formLayout.layoutsets],
        [select(staticUseLanguageFromState), staticUseLanguageFromState(mockState)],
        [select(selectValidationsState), mockState.formValidations.validations],
        [select(ResolvedNodesSelector), resolvedLayoutsFromState(mockState)],
        [call(httpGet, url, options), validationIssues],
      ])
      .put(
        ValidationActions.addValidations({
          validationObjects: [validationError],
        }),
      )
      .run();
  });

  it('runSingleFieldValidationSaga, single field validation error', () => {
    const instance = mockState.instanceData.instance;
    if (!instance) {
      throw new Error('Invalid mockState');
    }
    const url = getDataValidationUrl(instance.id, instance.data[0].id);
    const options: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: mockTriggerField,
      },
    };
    const error = new Error('Error');
    return expectSaga(runSingleFieldValidationSaga, {
      type: '',
      payload: {
        dataModelBinding: mockTriggerField,
        layoutId: 'FormLayout',
        componentId: 'field1',
      },
    })
      .provide([
        [select(selectApplicationMetadataState), mockState.applicationMetadata.applicationMetadata],
        [select(selectLayoutsState), mockState.formLayout.layouts],
        [select(selectHiddenFieldsState), mockState.formLayout.uiConfig.hiddenFields],
        [select(selectInstanceState), mockState.instanceData.instance],
        [select(selectLayoutSetsState), mockState.formLayout.layoutsets],
        [select(staticUseLanguageFromState), staticUseLanguageFromState(mockState)],
        [select(selectValidationsState), mockState.formValidations.validations],
        [select(ResolvedNodesSelector), resolvedLayoutsFromState(mockState)],
        [call(httpGet, url, options), throwError(error)],
      ])
      .put(ValidationActions.runSingleFieldValidationRejected({ error }))
      .run();
  });
});

import { call, select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { throwError } from 'redux-saga-test-plan/providers';
import type { AxiosRequestConfig } from 'axios';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { getInstanceDataMock } from 'src/__mocks__/instanceDataStateMock';
import {
  runSingleFieldValidationSaga,
  selectApplicationMetadataState,
  selectHiddenFieldsState,
  selectInstance,
  selectLayoutSetsState,
  selectProcess,
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
  let originalWindowError: typeof window.logError;

  beforeEach(() => {
    mockState = getInitialStateMock();
    originalWindowError = window.logError;
    window.logError = jest.fn();
  });

  afterEach(() => {
    window.logError = originalWindowError;
  });

  it('runSingleFieldValidationSaga, single field validation is triggered', () => {
    const instance = getInstanceDataMock();
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
        [select(selectInstance), mockState.deprecated.lastKnownInstance],
        [select(selectProcess), mockState.deprecated.lastKnownProcess],
        [select(selectApplicationMetadataState), mockState.applicationMetadata.applicationMetadata],
        [select(selectHiddenFieldsState), mockState.formLayout.uiConfig.hiddenFields],
        [select(selectLayoutSetsState), mockState.formLayout.layoutsets],
        [select(staticUseLanguageFromState), staticUseLanguageFromState(mockState)],
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
    const instance = getInstanceDataMock();
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
        [select(selectInstance), mockState.deprecated.lastKnownInstance],
        [select(selectProcess), mockState.deprecated.lastKnownProcess],
        [select(selectApplicationMetadataState), mockState.applicationMetadata.applicationMetadata],
        [select(selectHiddenFieldsState), mockState.formLayout.uiConfig.hiddenFields],
        [select(selectLayoutSetsState), mockState.formLayout.layoutsets],
        [select(staticUseLanguageFromState), staticUseLanguageFromState(mockState)],
        [select(ResolvedNodesSelector), resolvedLayoutsFromState(mockState)],
        [call(httpGet, url, options), throwError(error)],
      ])
      .put(ValidationActions.runSingleFieldValidationRejected({ error }))
      .run();
  });
});

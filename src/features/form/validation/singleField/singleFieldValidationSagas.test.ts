import { call, select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { throwError } from 'redux-saga-test-plan/providers';
import type { AxiosRequestConfig } from 'axios';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import {
  runSingleFieldValidationSaga,
  selectApplicationMetadataState,
  selectFormLayoutState,
  selectHiddenFieldsState,
  selectInstanceState,
  selectLayoutSetsState,
  selectLayoutsState,
  selectTextResourcesState,
  selectValidationsState,
} from 'src/features/form/validation/singleField/singleFieldValidationSagas';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { Severity } from 'src/types';
import { get } from 'src/utils/network/networking';
import { getDataValidationUrl } from 'src/utils/urls/appUrlHelper';
import type { IRuntimeState, IValidationIssue, IValidations } from 'src/types';

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

    const validationIssues: IValidationIssue[] = [
      {
        code: 'error',
        description: mockErrorMessage,
        field: 'Group.prop1',
        scope: null,
        severity: Severity.Error,
        targetId: '',
      },
    ];
    const mappedValidations: IValidations = {
      FormLayout: {
        field1: {
          simpleBinding: {
            errors: [mockErrorMessage],
          },
        },
      },
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
        [select(selectApplicationMetadataState), mockState.applicationMetadata.applicationMetadata],
        [select(selectFormLayoutState), mockState.formLayout],
        [select(selectLayoutsState), mockState.formLayout.layouts],
        [select(selectHiddenFieldsState), mockState.formLayout.uiConfig.hiddenFields],
        [select(selectInstanceState), mockState.instanceData.instance],
        [select(selectLayoutSetsState), mockState.formLayout.layoutsets],
        [select(selectTextResourcesState), mockState.textResources.resources],
        [select(selectValidationsState), mockState.formValidations.validations],
        [call(get, url, options), validationIssues],
      ])
      .put(
        ValidationActions.runSingleFieldValidationFulfilled({
          validations: mappedValidations,
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
        [select(selectFormLayoutState), mockState.formLayout],
        [select(selectLayoutsState), mockState.formLayout.layouts],
        [select(selectHiddenFieldsState), mockState.formLayout.uiConfig.hiddenFields],
        [select(selectInstanceState), mockState.instanceData.instance],
        [select(selectLayoutSetsState), mockState.formLayout.layoutsets],
        [select(selectTextResourcesState), mockState.textResources.resources],
        [select(selectValidationsState), mockState.formValidations.validations],
        [call(get, url, options), throwError(error)],
      ])
      .put(ValidationActions.runSingleFieldValidationRejected({ error }))
      .run();
  });
});

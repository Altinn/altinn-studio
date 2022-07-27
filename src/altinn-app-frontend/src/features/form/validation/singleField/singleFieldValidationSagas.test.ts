import { getInitialStateMock } from '__mocks__/initialStateMock';
import { call, select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { throwError } from 'redux-saga-test-plan/providers';
import type { AxiosRequestConfig } from 'axios';

import { runSingleFieldValidationSaga } from 'src/features/form/validation/singleField/singleFieldValidationSagas';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { Severity } from 'src/types';
import { getDataValidationUrl } from 'src/utils/appUrlHelper';
import { get } from 'src/utils/networking';
import type { IRuntimeState, IValidationIssue, IValidations } from 'src/types';

import { getParsedLanguageFromText } from 'altinn-shared/index';

describe('singleFieldValidationSagas', () => {
  let mockState: IRuntimeState;
  const mockTriggerField = 'mockField';
  const mockErrorMessage = 'This is wrong';

  beforeEach(() => {
    mockState = getInitialStateMock();
    mockState.formValidations.currentSingleFieldValidation = {
      dataModelBinding: mockTriggerField,
      componentId: 'mockId',
      layoutId: 'formLayout',
    };
  });

  it('runSingleFieldValidationSaga, single field validation is triggered', () => {
    const url = getDataValidationUrl(
      mockState.instanceData.instance.id,
      mockState.instanceData.instance.data[0].id,
    );
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
        targetId: null,
      },
    ];
    const mappedValidations: IValidations = {
      FormLayout: {
        field1: {
          simpleBinding: {
            errors: [getParsedLanguageFromText(mockErrorMessage) as any],
          },
        },
      },
    };

    return expectSaga(runSingleFieldValidationSaga)
      .provide([
        [select(), mockState],
        [call(get, url, options), validationIssues],
      ])
      .put(ValidationActions.setCurrentSingleFieldValidation({}))
      .put(
        ValidationActions.runSingleFieldValidationFulfilled({
          validations: mappedValidations,
        }),
      )
      .run();
  });

  it('runSingleFieldValidationSaga, single field validation error', () => {
    const url = getDataValidationUrl(
      mockState.instanceData.instance.id,
      mockState.instanceData.instance.data[0].id,
    );
    const options: AxiosRequestConfig = {
      headers: {
        ValidationTriggerField: mockTriggerField,
      },
    };
    const error = new Error('Error');
    return expectSaga(runSingleFieldValidationSaga)
      .provide([
        [select(), mockState],
        [call(get, url, options), throwError(error)],
      ])
      .put(ValidationActions.setCurrentSingleFieldValidation({}))
      .put(ValidationActions.runSingleFieldValidationRejected({ error }))
      .run();
  });
});

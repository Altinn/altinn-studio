import { call, select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { AxiosRequestConfig } from 'axios';
import { throwError } from 'redux-saga-test-plan/providers';

import { getInitialStateMock } from '../../../../../__mocks__/initialStateMock';

import type { IRuntimeState, IValidationIssue, IValidations } from 'src/types';

import { get } from '../../../../utils/networking';
import {
  runSingleFieldValidationFulfilled,
  runSingleFieldValidationRejected,
  setCurrentSingleFieldValidation,
} from '../validationSlice';
import { Severity } from 'src/types';
import { getDataValidationUrl } from '../../../../utils/appUrlHelper';
import { getParsedLanguageFromText } from '../../../../../../shared/src';

import { runSingleFieldValidationSaga } from './singleFieldValidationSagas';

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
          simple: {
            errors: [getParsedLanguageFromText(mockErrorMessage) as any],
            warnings: [],
          },
        },
      },
    };

    return expectSaga(runSingleFieldValidationSaga)
      .provide([
        [select(), mockState],
        [call(get, url, options), validationIssues],
      ])
      .put(setCurrentSingleFieldValidation({}))
      .put(
        runSingleFieldValidationFulfilled({ validations: mappedValidations }),
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
      .put(setCurrentSingleFieldValidation({}))
      .put(runSingleFieldValidationRejected({ error }))
      .run();
  });
});

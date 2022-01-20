import { mount } from 'enzyme';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { getInitialStateMock } from "../../../__mocks__/mocks";
import { IRuntimeState } from '../../../src/types';
import ErrorReport from '../../../src/components/message/ErrorReport';
import { IValidationState } from '../../../src/features/form/validation/validationSlice';
import * as React from 'react';
import { getParsedLanguageFromText } from '../../../../shared/src';

describe('components > ErrorReport.tsx', () => {

  const mountComponent = (state: IRuntimeState) => {
    const createStore = configureStore();
    const mockStore = createStore(state);
    return mount(
      <Provider store={mockStore} >
        <ErrorReport />
      </Provider>
    );
  };

  it('should render generic error message by default', () => {
    const mockValidationState: IValidationState = {
      validations: {
        page1: {
          someComponent: {
            simpleBinding: {
              errors: [getParsedLanguageFromText('some error')],
            },
          }
        }
      },
      invalidDataTypes: [],
      currentSingleFieldValidation: null,
      error: null,
    }
    const initialState = getInitialStateMock({ formValidations: mockValidationState});
    const component = mountComponent(initialState);
    const genericErrorText = initialState.language.language.form_filler['error_report_description'];
    expect(component.text().includes(genericErrorText)).toBeTruthy();

  });

  it('should list unmapped errors if present and hide generic error message', () => {
    const mockValidationState: IValidationState = {
      validations: {
        unmapped: { // unmapped layout
          unmapped: { // unmapped component
            unmapped: { // unmapped data binding
              errors: [getParsedLanguageFromText('some unmapped error')],
            },
          },
        },
      },
      invalidDataTypes: [],
      currentSingleFieldValidation: null,
      error: null,
    };
    const initialState = getInitialStateMock({ formValidations: mockValidationState});
    const component = mountComponent(initialState);
    const genericErrorText = initialState.language.language.form_filler['error_report_description'];
    expect(component.text().includes(genericErrorText)).toBeFalsy();
    expect(component.text().includes('some unmapped error')).toBeTruthy();
  });
});

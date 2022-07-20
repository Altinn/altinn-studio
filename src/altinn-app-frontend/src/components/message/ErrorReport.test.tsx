import * as React from 'react';

import { screen } from '@testing-library/react';

import ErrorReport from 'src/components/message/ErrorReport';
import type { IValidationState } from 'src/features/form/validation/validationSlice';
import type { IValidations } from 'src/types';

import { getInitialStateMock } from 'altinn-app-frontend/__mocks__/mocks';
import { renderWithProviders } from 'altinn-app-frontend/testUtils';

import { getParsedLanguageFromText } from 'altinn-shared/utils';

describe('ErrorReport', () => {
  const genericErrorText =
    getInitialStateMock().language.language.form_filler[
      'error_report_description'
    ];

  const render = (validations: Partial<IValidations>) => {
    const mockValidationState: IValidationState = {
      validations: {
        ...validations,
      },
      invalidDataTypes: [],
      currentSingleFieldValidation: null,
      error: null,
    };
    const initialState = getInitialStateMock({
      formValidations: mockValidationState,
    });

    return renderWithProviders(<ErrorReport />, {
      preloadedState: initialState,
    });
  };

  it('should render generic error message by default', () => {
    const validations = {
      page1: {
        someComponent: {
          simpleBinding: {
            errors: [getParsedLanguageFromText('some error')],
          },
        },
      },
    };
    render(validations);

    expect(screen.getByText(genericErrorText)).toBeInTheDocument();
  });

  it('should list unmapped errors if present and hide generic error message', () => {
    const validations = {
      unmapped: {
        // unmapped layout
        unmapped: {
          // unmapped component
          unmapped: {
            // unmapped data binding
            errors: [getParsedLanguageFromText('some unmapped error')],
          },
        },
      },
    };

    render(validations);

    expect(screen.queryByText(genericErrorText)).not.toBeInTheDocument();
    expect(screen.getByText('some unmapped error')).toBeInTheDocument();
  });
});

import * as React from 'react';

import { getInitialStateMock } from '../../../__mocks__/mocks';
import type { IValidations } from 'src/types';
import type { IValidationState } from 'src/features/form/validation/validationSlice';

import { getParsedLanguageFromText } from 'altinn-shared/utils';
import ErrorReport from './ErrorReport';
import { renderWithProviders } from '../../../testUtils';
import { screen } from '@testing-library/react';

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

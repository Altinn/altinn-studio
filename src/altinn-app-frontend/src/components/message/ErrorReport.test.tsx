import * as React from 'react';

import { getInitialStateMock } from '__mocks__/mocks';
import { screen } from '@testing-library/react';
import { renderWithProviders } from 'testUtils';

import ErrorReport from 'src/components/message/ErrorReport';
import type { IValidationState } from 'src/features/form/validation/validationSlice';
import type { IValidations } from 'src/types';

describe('ErrorReport', () => {
  const render = (validations: Partial<IValidations>) => {
    const mockValidationState: IValidationState = {
      validations: {
        ...(validations as any),
      },
      invalidDataTypes: [],
      error: null,
    };
    const initialState = getInitialStateMock({
      formValidations: mockValidationState,
    });

    return renderWithProviders(<ErrorReport components={[]} />, {
      preloadedState: initialState,
    });
  };

  it('should not render when there are no errors', () => {
    render({});
    expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
  });

  it('should list unmapped errors as unclickable', () => {
    const validations = {
      unmapped: {
        // unmapped layout
        unmapped: {
          // unmapped component
          unmapped: {
            // unmapped data binding
            errors: ['some unmapped error'],
          },
        },
      },
    };

    render(validations);
    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();

    // Unmapped errors should not be clickable
    const errorNode = screen.getByText('some unmapped error');
    expect(errorNode).toBeInTheDocument();
    expect(errorNode.parentElement?.tagName).toEqual('LI');
  });

  it('should list mapped error as clickable', () => {
    const validations = {
      page1: {
        someComponent: {
          simpleBinding: {
            errors: ['some mapped error'],
          },
        },
      },
    };

    render(validations);
    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();

    const errorNode = screen.getByText('some mapped error');
    expect(errorNode).toBeInTheDocument();
    expect(errorNode.parentElement?.parentElement?.tagName).toEqual('LI');
    expect(errorNode.parentElement?.tagName).toEqual('BUTTON');
  });
});

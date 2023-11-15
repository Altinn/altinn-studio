import React from 'react';

import { screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { ErrorReport } from 'src/components/message/ErrorReport';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IValidationState } from 'src/features/validation/validationSlice';
import type { IValidations } from 'src/utils/validation/types';

describe('ErrorReport', () => {
  const render = async (validations: Partial<IValidations>) => {
    const mockValidationState: IValidationState = {
      validations: {
        ...(validations as any),
      },
      invalidDataTypes: [],
      error: null,
    };
    const reduxState = getInitialStateMock({
      formValidations: mockValidationState,
    });

    return await renderWithInstanceAndLayout({
      renderer: () => <ErrorReport nodes={[]} />,
      reduxState,
    });
  };

  it('should not render when there are no errors', async () => {
    await render({});
    expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
  });

  it('should list unmapped errors as unclickable', async () => {
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

    await render(validations);
    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();

    // Unmapped errors should not be clickable
    const errorNode = screen.getByText('some unmapped error');
    expect(errorNode).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access
    expect(errorNode.parentElement?.tagName).toEqual('LI');
  });

  it('should list mapped error as clickable', async () => {
    const validations = {
      page1: {
        someComponent: {
          simpleBinding: {
            errors: ['some mapped error'],
          },
        },
      },
    };

    await render(validations);
    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();

    const errorNode = screen.getByText('some mapped error');
    expect(errorNode).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access
    expect(errorNode.parentElement?.parentElement?.tagName).toEqual('LI');
    // eslint-disable-next-line testing-library/no-node-access
    expect(errorNode.parentElement?.tagName).toEqual('BUTTON');
  });
});

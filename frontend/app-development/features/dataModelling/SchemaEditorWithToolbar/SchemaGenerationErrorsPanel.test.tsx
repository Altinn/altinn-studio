import React from 'react';
import { renderWithMockStore } from '../../../test/mocks';
import type { SchemaGenerationErrorsPanelProps } from './SchemaGenerationErrorsPanel';
import { SchemaGenerationErrorsPanel } from './SchemaGenerationErrorsPanel';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../testing/mocks/i18nMock';

const user = userEvent.setup();
const schemaGenerationErrorMessages = ['custom error message', 'another custom error message'];
const defaultProps: SchemaGenerationErrorsPanelProps = {
  onCloseErrorsPanel: jest.fn(),
  schemaGenerationErrorMessages,
};

describe('SchemaGenerationErrorsPanel', () => {
  it('Displays error title and list of errors when schemaGenerationErrorMessages contains errors', () => {
    render({});
    const errorTitle = screen.getByText(textMock('api_errors.DM_01'));
    expect(errorTitle).toBeInTheDocument();
    const errorMessage1 = screen.getByText(schemaGenerationErrorMessages[0]);
    expect(errorMessage1).toBeInTheDocument();
    const errorMessage2 = screen.getByText(schemaGenerationErrorMessages[1]);
    expect(errorMessage2).toBeInTheDocument();
  });

  it('Displays list of text-mapped errors when schemaGenerationErrorMessages contains known errors', () => {
    render(
      {},
      {
        ...defaultProps,
        schemaGenerationErrorMessages: [
          "'SomeFieldInSchema' member names cannot be the same as their enclosing type",
        ],
      },
    );
    const errorTitle = screen.getByText(textMock('api_errors.DM_01'));
    expect(errorTitle).toBeInTheDocument();
    const knownErrorMessage = screen.getByText(
      textMock('api_errors.DM_CsharpCompiler_NameCollision'),
    );
    expect(knownErrorMessage).toBeInTheDocument();
  });

  it('Displays text-mapped known schemaErrors and plaintext unknown errors', () => {
    const unknownErrorMessage = 'an unknown error';
    render(
      {},
      {
        ...defaultProps,
        schemaGenerationErrorMessages: [
          unknownErrorMessage,
          "'SomeFieldInSchema' member names cannot be the same as their enclosing type",
        ],
      },
    );
    const errorTitle = screen.getByText(textMock('api_errors.DM_01'));
    expect(errorTitle).toBeInTheDocument();
    const errorMessage = screen.getByText(unknownErrorMessage);
    expect(errorMessage).toBeInTheDocument();
    const knownErrorMessage = screen.getByText(
      textMock('api_errors.DM_CsharpCompiler_NameCollision'),
    );
    expect(knownErrorMessage).toBeInTheDocument();
  });

  it('Calls onCloseErrorsPanel when close button is clicked', async () => {
    const mockOnCloseErrorsPanel = jest.fn();
    render({}, { ...defaultProps, onCloseErrorsPanel: mockOnCloseErrorsPanel });
    const closeErrorPanelButton = screen.getByRole('button', { name: textMock('general.close') });
    await act(() => user.click(closeErrorPanelButton));
    expect(mockOnCloseErrorsPanel).toHaveBeenCalledTimes(1);
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  props: Partial<SchemaGenerationErrorsPanelProps> = {},
) => renderWithMockStore({}, queries)(<SchemaGenerationErrorsPanel {...defaultProps} {...props} />);

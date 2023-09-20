import React, { ReactNode } from 'react';
import { render, screen, act } from '@testing-library/react';
import {
  LocalChangesActionButton,
  LocalChangesActionButtonProps,
} from './LocalChangesActionButton';
import { TestFlaskIcon } from '@navikt/aksel-icons';
import userEvent from '@testing-library/user-event';

const mockLabel: string = 'Test label';
const mockDescription: string = 'Test description';
const mockIcon: ReactNode = <TestFlaskIcon />;
const mockText: string = 'Test text';

describe('LocalChangesActionButton', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  const mockOnClick = jest.fn();

  const defaultProps: LocalChangesActionButtonProps = {
    label: mockLabel,
    description: mockDescription,
    onClick: mockOnClick,
    icon: mockIcon,
    text: mockText,
  };

  it('renders the component with provided props', () => {
    render(<LocalChangesActionButton {...defaultProps} />);

    expect(screen.getByText(mockLabel)).toBeInTheDocument();
    expect(screen.getByText(mockDescription)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mockText })).toBeInTheDocument();
  });

  it('calls the onClick function when the button is clicked', async () => {
    render(<LocalChangesActionButton {...defaultProps} />);

    const button = screen.getByRole('button', { name: mockText });
    await act(() => user.click(button));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});

import type { ReactNode } from 'react';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import type { Action, LocalChangesActionButtonProps } from './LocalChangesActionButton';
import { LocalChangesActionButton } from './LocalChangesActionButton';
import { TestFlaskIcon } from '@navikt/aksel-icons';
import userEvent from '@testing-library/user-event';

const mockLabel: string = 'Test label';
const mockDescription: string = 'Test description';
const mockIcon: ReactNode = <TestFlaskIcon />;
const mockText: string = 'Test text';

const mockOnClick = jest.fn();

const mockActionLink: Action = {
  type: 'link',
  href: 'test',
};

const mockActionButton: Action = {
  type: 'button',
  onClick: mockOnClick,
};

describe('LocalChangesActionButton', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  const defaultProps: LocalChangesActionButtonProps = {
    label: mockLabel,
    description: mockDescription,
    action: mockActionButton,
    icon: mockIcon,
    text: mockText,
  };

  it('renders the component with provided props using button', () => {
    render(<LocalChangesActionButton {...defaultProps} />);

    expect(screen.getByText(mockLabel)).toBeInTheDocument();
    expect(screen.getByText(mockDescription)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: mockText })).toBeInTheDocument();
  });

  it('renders the component with provided props using link', () => {
    render(<LocalChangesActionButton {...defaultProps} action={mockActionLink} />);

    expect(screen.getByText(mockLabel)).toBeInTheDocument();
    expect(screen.getByText(mockDescription)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: mockText })).toBeInTheDocument();
  });

  it('calls the onClick function when the button is clicked', async () => {
    render(<LocalChangesActionButton {...defaultProps} />);

    const button = screen.getByRole('button', { name: mockText });
    await act(() => user.click(button));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});

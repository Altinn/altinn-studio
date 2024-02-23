import type { ReactNode } from 'react';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StudioModalProps } from './StudioModal';
import { StudioModal } from './StudioModal';

const closeButtonLabel: string = 'close';

const mockTitle: ReactNode = (
  <div>
    <h2>Title</h2>
  </div>
);

const mockChildren = (
  <div>
    <p>Modal test</p>
  </div>
);

describe('Modal', () => {
  afterEach(jest.clearAllMocks);

  const mockOnClose = jest.fn();

  const defaultProps: StudioModalProps = {
    isOpen: true,
    onClose: mockOnClose,
    title: mockTitle,
    children: mockChildren,
    closeButtonLabel,
  };

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    render(<StudioModal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: closeButtonLabel });
    await act(() => user.click(closeButton));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not show content when modal is clsoed', () => {
    render(<StudioModal {...defaultProps} isOpen={false} />);

    const closeButton = screen.queryByRole('button', { name: closeButtonLabel });
    expect(closeButton).not.toBeInTheDocument();
  });
});

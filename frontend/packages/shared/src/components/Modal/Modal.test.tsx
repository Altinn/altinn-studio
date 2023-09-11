import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, ModalProps } from './Modal';
import { textMock } from '../../../../../testing/mocks/i18nMock';

const mockTitle = (
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

  const defaultProps: ModalProps = {
    isOpen: true,
    onClose: mockOnClose,
    title: mockTitle,
    children: mockChildren,
  };

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: textMock('modal.close_icon') });
    await act(() => user.click(closeButton));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not show content when modal is clsoed', () => {
    render(<Modal {...defaultProps} isOpen={false} />);

    const closeButton = screen.queryByRole('button', { name: textMock('modal.close_icon') });
    expect(closeButton).not.toBeInTheDocument();
  });
});

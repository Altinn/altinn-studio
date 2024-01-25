import React from 'react';
import { render, screen } from '@testing-library/react';
import type { VerificationModalProps } from './VerificationModal';
import { VerificationModal } from './VerificationModal';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';

const mockModalText: string = 'Mock modal text';
const mockCloseButtonText: string = 'Close';
const mockActionButtonText: string = 'Confirm';

describe('VerificationModal', () => {
  afterEach(jest.clearAllMocks);

  const mockOnClose = jest.fn();
  const mockOnPerformAction = jest.fn();

  const defaultProps: VerificationModalProps = {
    isOpen: true,
    onClose: mockOnClose,
    text: mockModalText,
    closeButtonText: mockCloseButtonText,
    actionButtonText: mockActionButtonText,
    onPerformAction: mockOnPerformAction,
  };

  it('does render the modal when it is open', () => {
    render(<VerificationModal {...defaultProps} />);

    const modalHeader = screen.getByRole('heading', {
      name: textMock('policy_editor.verification_modal_heading'),
      level: 1,
    });

    expect(modalHeader).toBeInTheDocument();
  });

  it('does not render the modal when it is closed', () => {
    render(<VerificationModal {...defaultProps} isOpen={false} />);

    const modalHeader = screen.queryByRole('heading', {
      name: textMock('policy_editor.verification_modal_heading'),
      level: 2,
    });

    expect(modalHeader).not.toBeInTheDocument();
  });

  it('calls "onClose" when the close button is clicked', async () => {
    const user = userEvent.setup();
    render(<VerificationModal {...defaultProps} />);

    const closeButton = screen.getByText(mockCloseButtonText);
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls "onPerformAction" when the action button is clicked', async () => {
    const user = userEvent.setup();
    render(<VerificationModal {...defaultProps} />);

    const actionButton = screen.getByText(mockActionButtonText);
    await act(() => user.click(actionButton));

    expect(mockOnPerformAction).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionExpiredModal, type SessionExpiredModalProps } from './SessionExpiredModal';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockOnClose = jest.fn();
const mockOnContinue = jest.fn();

const defaultProps: SessionExpiredModalProps = {
  open: false,
  onClose: mockOnClose,
  onContinue: mockOnContinue,
};

describe('SessionExpiredModal', () => {
  it('should call "onContinue" when the continue button is clicked', async () => {
    const user = userEvent.setup();
    renderSessionExpiredModal({ open: true });

    const continueButton = screen.getByRole('button', { name: textMock('general.continue') });
    await user.click(continueButton);
    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it('should call "onClose" when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderSessionExpiredModal({ open: true });

    const signOutButton = screen.getByRole('button', { name: textMock('general.sign_out') });
    await user.click(signOutButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not render the modal when open is false', () => {
    renderSessionExpiredModal({ open: false });

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText(textMock('session.inactive'))).not.toBeInTheDocument();
  });
});

const renderSessionExpiredModal = (props: Partial<SessionExpiredModalProps> = {}) => {
  return render(<SessionExpiredModal {...defaultProps} {...props} />);
};

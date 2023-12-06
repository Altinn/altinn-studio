import React, { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import { VerificationModal, VerificationModalProps } from './VerificationModal';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';

const mockButtonText: string = 'Mock Button';
const mockModalText: string = 'Mock modal text';
const mockCloseButtonText: string = 'Close';
const mockActionButtonText: string = 'Confirm';

const mockOnClose = jest.fn();
const mockOnPerformAction = jest.fn();

const defaultProps: VerificationModalProps = {
  onClose: mockOnClose,
  text: mockModalText,
  closeButtonText: mockCloseButtonText,
  actionButtonText: mockActionButtonText,
  onPerformAction: mockOnPerformAction,
};

describe('VerificationModal', () => {
  afterEach(jest.clearAllMocks);

  it('does render the modal when it is open', async () => {
    await renderAndOpenModal();

    const modalHeader = screen.getByRole('heading', {
      name: textMock('policy_editor.verification_modal_heading'),
      level: 1,
    });

    expect(modalHeader).toBeInTheDocument();
  });

  it('does not render the modal when it is closed', () => {
    render(<TestComponentWithButton />);

    const modalHeader = screen.queryByRole('heading', {
      name: textMock('policy_editor.verification_modal_heading'),
      level: 2,
    });

    expect(modalHeader).not.toBeInTheDocument();
  });

  it('calls "onClose" when the close button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const closeButton = screen.getByText(mockCloseButtonText);
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls "onPerformAction" when the action button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const actionButton = screen.getByText(mockActionButtonText);
    await act(() => user.click(actionButton));

    expect(mockOnPerformAction).toHaveBeenCalledTimes(1);
  });
});

const renderAndOpenModal = async (props: Partial<VerificationModalProps> = {}) => {
  const user = userEvent.setup();
  render(<TestComponentWithButton {...props} />);

  const openModalButton = screen.getByRole('button', { name: mockButtonText });
  await act(() => user.click(openModalButton));
};

const TestComponentWithButton = (props: Partial<VerificationModalProps> = {}) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.showModal()}>{mockButtonText}</button>
      <VerificationModal ref={modalRef} {...defaultProps} {...props} />
    </>
  );
};

import React, { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import type { NavigationModalProps } from './NavigationModal';
import { NavigationModal } from './NavigationModal';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockButtonText: string = 'Mock Button';
const mockOnClose = jest.fn();
const mockOnNavigate = jest.fn();
const defaultProps: NavigationModalProps = {
  onClose: mockOnClose,
  onNavigate: mockOnNavigate,
  title: textMock('resourceadm.resource_navigation_modal_title_policy'),
};

describe('NavigationModal', () => {
  afterEach(jest.clearAllMocks);

  it('calls onClose function when close button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const closeButton = screen.getByRole('button', {
      name: textMock('resourceadm.resource_navigation_modal_button_stay'),
    });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onNavigate function when navigate button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const navigateButton = screen.getByRole('button', {
      name: textMock('resourceadm.resource_navigation_modal_button_move_on'),
    });
    await user.click(navigateButton);

    expect(mockOnNavigate).toHaveBeenCalled();
  });
});

const renderAndOpenModal = async (user: UserEvent) => {
  render(<TestComponentWithButton />);

  const openModalButton = screen.getByRole('button', { name: mockButtonText });
  await user.click(openModalButton);
};

const TestComponentWithButton = () => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.showModal()}>{mockButtonText}</button>
      <NavigationModal ref={modalRef} {...defaultProps} />
    </>
  );
};

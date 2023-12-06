import React, { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavigationModal, NavigationModalProps } from './NavigationModal';
import { textMock } from '../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';

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

  it('should be closed by default', () => {
    render(<TestComponentWithButton />);
    const closeButton = screen.queryByRole('button', { name: textMock('general.cancel') });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls onClose function when close button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const closeButton = screen.getByRole('button', {
      name: textMock('resourceadm.resource_navigation_modal_button_stay'),
    });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onNavigate function when navigate button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const navigateButton = screen.getByRole('button', {
      name: textMock('resourceadm.resource_navigation_modal_button_move_on'),
    });
    await act(() => user.click(navigateButton));

    expect(mockOnNavigate).toHaveBeenCalled();
  });
});

const renderAndOpenModal = async (props: Partial<NavigationModalProps> = {}) => {
  const user = userEvent.setup();
  render(<TestComponentWithButton {...props} />);

  const openModalButton = screen.getByRole('button', { name: mockButtonText });
  await act(() => user.click(openModalButton));
};

const TestComponentWithButton = (props: Partial<NavigationModalProps> = {}) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.showModal()}>{mockButtonText}</button>
      <NavigationModal ref={modalRef} {...defaultProps} {...props} />
    </>
  );
};

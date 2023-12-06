import React, { useRef } from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewResourceModal, NewResourceModalProps } from './NewResourceModal';
import { act } from 'react-dom/test-utils'; // Import act if needed
import { textMock } from '../../../testing/mocks/i18nMock';
import { MemoryRouter } from 'react-router-dom';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const mockButtonText: string = 'Mock Button';

const mockOnClose = jest.fn();

const defaultProps: NewResourceModalProps = {
  onClose: mockOnClose,
};

describe('NewResourceModal', () => {
  afterEach(jest.clearAllMocks);

  it('should be closed by default', () => {
    render();
    const closeButton = screen.queryByRole('button', { name: textMock('general.cancel') });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls onClose function when close button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const closeButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('that create button should be disabled until the form is valid', async () => {
    await renderAndOpenModal();

    const createButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_create_modal_create_button'),
    });
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  test('that create button should be enabled when the form is valid', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const titleInput = screen.getByLabelText(
      textMock('resourceadm.dashboard_resource_name_and_id_resource_name'),
    );
    await act(() => user.type(titleInput, 'test'));

    const createButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_create_modal_create_button'),
    });
    expect(createButton).toHaveAttribute('aria-disabled', 'false');
  });
});

const render = (props: Partial<NewResourceModalProps> = {}) => {
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
        <TestComponentWithButton {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

const renderAndOpenModal = async (props: Partial<NewResourceModalProps> = {}) => {
  const user = userEvent.setup();
  render(props);

  const openModalButton = screen.getByRole('button', { name: mockButtonText });
  await act(() => user.click(openModalButton));
};

const TestComponentWithButton = (props: Partial<NewResourceModalProps> = {}) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.showModal()}>{mockButtonText}</button>
      <NewResourceModal ref={modalRef} {...defaultProps} {...props} />
    </>
  );
};

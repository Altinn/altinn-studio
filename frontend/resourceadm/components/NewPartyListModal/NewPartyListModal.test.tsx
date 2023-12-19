import React, { useRef } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { NewPartyListModal } from './NewPartyListModal';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const mockButtonText: string = 'Mock Button';
const closeModalMock = jest.fn();
const partyListCreatedMock = jest.fn();

const defaultProps = {
  org: 'orgname',
  env: 'tt02',
  onClose: closeModalMock,
  onPartyListCreated: partyListCreatedMock,
};

const user = userEvent.setup();

describe('NewPartyListModal', () => {
  it('should disable create button when name or id is empty', async () => {
    await renderAndOpenModal();

    const createButton = screen.getByText(textMock('resourceadm.listadmin_confirm_create_list'));
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should close modal on cancel click', async () => {
    await renderAndOpenModal();

    const closeButton = screen.getByText(textMock('general.cancel'));
    await act(() => user.click(closeButton));

    expect(closeModalMock).toHaveBeenCalled();
  });

  it('should call service to create new party list', async () => {
    await renderAndOpenModal();

    const nameField = screen.getByLabelText(textMock('resourceadm.listadmin_list_name'));
    await act(() => user.type(nameField, 'nytt navn'));

    const createButton = screen.getByText(textMock('resourceadm.listadmin_confirm_create_list'));
    await act(() => user.click(createButton));

    await waitFor(() => {
      expect(partyListCreatedMock).toHaveBeenCalled();
    });
  });

  it('should show error message when trying to create a party list with an existing identifier', async () => {
    await renderAndOpenModal({
      createPartyList: jest
        .fn()
        .mockImplementation(() => Promise.reject({ response: { status: 409 } })),
    });

    const nameField = screen.getByLabelText(textMock('resourceadm.listadmin_list_name'));
    await act(() => user.type(nameField, 'nytt navn'));

    const createButton = screen.getByText(textMock('resourceadm.listadmin_confirm_create_list'));
    await act(() => user.click(createButton));

    expect(
      await screen.findByText(textMock('resourceadm.listadmin_identifier_conflict')),
    ).toBeInTheDocument();
  });
});

const render = (queryMocks: Partial<ServicesContextProps>) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queryMocks,
  };

  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <TestComponentWithButton />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

const renderAndOpenModal = async (queryMocks: Partial<ServicesContextProps> = {}) => {
  render(queryMocks);

  const openModalButton = screen.getByRole('button', { name: mockButtonText });
  await act(() => user.click(openModalButton));
};

const TestComponentWithButton = () => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.showModal()}>{mockButtonText}</button>
      <NewPartyListModal ref={modalRef} {...defaultProps} />
    </>
  );
};

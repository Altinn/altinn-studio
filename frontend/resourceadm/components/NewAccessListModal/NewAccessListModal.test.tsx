import React, { useRef } from 'react';
import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { NewAccessListModalProps } from './NewAccessListModal';
import { NewAccessListModal } from './NewAccessListModal';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { renderWithProviders } from '@studio/testing/wrapper';

const mockButtonText: string = 'Mock Button';
const closeModalMock = jest.fn();

const defaultProps: NewAccessListModalProps = {
  org: 'orgname',
  env: 'tt02',
  navigateUrl: '/accesslists/tt02/',
  onClose: closeModalMock,
};

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

describe('NewAccessListModal', () => {
  afterEach(jest.clearAllMocks);

  it('should disable create button when name or id is empty', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const createButton = screen.getByText(textMock('resourceadm.listadmin_confirm_create_list'));
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should close modal on cancel click', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const closeButton = screen.getByText(textMock('general.cancel'));
    await user.click(closeButton);

    expect(closeModalMock).toHaveBeenCalled();
  });

  it('should navigate after access list is created', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user);

    const nameField = screen.getByLabelText(textMock('resourceadm.listadmin_list_name'));
    await user.type(nameField, 'nytt navn');

    const createButton = screen.getByText(textMock('resourceadm.listadmin_confirm_create_list'));
    await user.click(createButton);

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/accesslists/tt02/nytt-navn');
    });
  });

  it('should show error message when trying to create an access list with an existing identifier', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user, {
      createAccessList: jest
        .fn()
        .mockImplementation(() => Promise.reject({ response: { status: ServerCodes.Conflict } })),
    });

    const nameField = screen.getByLabelText(textMock('resourceadm.listadmin_list_name'));
    await user.type(nameField, 'nytt navn');

    const createButton = screen.getByText(textMock('resourceadm.listadmin_confirm_create_list'));
    await user.click(createButton);

    expect(
      await screen.findByText(textMock('resourceadm.listadmin_identifier_conflict')),
    ).toBeInTheDocument();
  });

  it('should show error message when access list request returns http status code 412', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal(user, {
      createAccessList: jest
        .fn()
        .mockImplementation(() =>
          Promise.reject({ response: { status: ServerCodes.PreconditionFailed } }),
        ),
    });

    const nameField = screen.getByLabelText(textMock('resourceadm.listadmin_list_name'));
    await user.type(nameField, 'nytt navn');

    const createButton = screen.getByText(textMock('resourceadm.listadmin_confirm_create_list'));
    await user.click(createButton);

    expect(
      await screen.findByText(textMock('resourceadm.listadmin_identifier_conflict')),
    ).toBeInTheDocument();
  });
});

const renderNewAccessListModal = (queries: Partial<ServicesContextProps>) => {
  return renderWithProviders(<TestComponentWithButton />, { queries });
};

const renderAndOpenModal = async (
  user: UserEvent,
  queryMocks: Partial<ServicesContextProps> = {},
) => {
  renderNewAccessListModal(queryMocks);

  const openModalButton = screen.getByRole('button', { name: mockButtonText });
  await user.click(openModalButton);
};

const TestComponentWithButton = () => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.showModal()}>{mockButtonText}</button>
      <NewAccessListModal ref={modalRef} {...defaultProps} />
    </>
  );
};

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { PartyListDetail, PartyListDetailProps } from './PartyListDetail';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

const testOrg = 'ttd';
const testEnv = 'tt02';
const testListeIdentifier = 'listid';

const defaultProps = {
  org: testOrg,
  env: testEnv,
  list: {
    env: testEnv,
    identifier: testListeIdentifier,
    name: 'Test-liste',
    description: 'Dette er en beskrivelse',
    members: [
      {
        orgNr: '123456789',
        orgName: '',
        isUnderenhet: false,
      },
    ],
  },
  backUrl: '/listadmin',
};

const user = userEvent.setup();

describe('PartyListDetail', () => {
  it('should show special name if name is not found', () => {
    render();
    expect(screen.getByText(textMock('resourceadm.listadmin_empty_name'))).toBeInTheDocument();
  });

  it('should show message when list is empty', () => {
    render({ list: { ...defaultProps.list, members: [] } });
    expect(screen.getByText(textMock('resourceadm.listadmin_empty_list'))).toBeInTheDocument();
  });

  it('should call service to remove member', async () => {
    const removePartyListMemberMock = jest.fn();
    render({}, { removePartyListMember: removePartyListMemberMock });

    const removeButton = screen.getByText(textMock('resourceadm.listadmin_remove_from_list'));
    await act(() => user.click(removeButton));

    expect(removePartyListMemberMock).toHaveBeenCalled();
  });

  it('should call service to add member if member is added back', async () => {
    const addPartyListMemberMock = jest.fn();
    render({}, { addPartyListMember: addPartyListMemberMock });

    const removeButton = screen.getByText(textMock('resourceadm.listadmin_remove_from_list'));
    await act(() => user.click(removeButton));

    const reAddButton = screen.getByText(textMock('resourceadm.listadmin_undo_remove_from_list'));
    await act(() => user.click(reAddButton));

    expect(addPartyListMemberMock).toHaveBeenCalled();
  });

  it('should call service to update name', async () => {
    const updatePartyListMock = jest.fn();
    render({}, { updatePartyList: updatePartyListMock });

    const nameField = screen.getByLabelText(textMock('resourceadm.listadmin_list_name'));
    await act(() => user.type(nameField, ' endret'));
    act(() => nameField.blur());

    expect(updatePartyListMock).toHaveBeenCalledWith(testOrg, testListeIdentifier, testEnv, [
      { op: 'replace', path: '/name', value: 'Test-liste endret' },
    ]);
  });

  it('should call service to update description', async () => {
    const updatePartyListMock = jest.fn();
    render({}, { updatePartyList: updatePartyListMock });

    const descriptionField = screen.getByLabelText(
      textMock('resourceadm.listadmin_list_description'),
    );
    await act(() => user.type(descriptionField, ' endret'));
    act(() => descriptionField.blur());

    expect(updatePartyListMock).toHaveBeenCalledWith(testOrg, testListeIdentifier, testEnv, [
      { op: 'replace', path: '/description', value: 'Dette er en beskrivelse endret' },
    ]);
  });

  it('should call service to remove description', async () => {
    const updatePartyListMock = jest.fn();
    render({}, { updatePartyList: updatePartyListMock });

    const descriptionField = screen.getByLabelText(
      textMock('resourceadm.listadmin_list_description'),
    );
    await act(() => user.clear(descriptionField));
    act(() => descriptionField.blur());

    expect(updatePartyListMock).toHaveBeenCalledWith(testOrg, testListeIdentifier, testEnv, [
      { op: 'remove', path: '/description' },
    ]);
  });

  it('should navigate back after list is deleted', async () => {
    const addPartyListMemberMock = jest.fn();
    render({}, { addPartyListMember: addPartyListMemberMock });

    const deleteListButton = screen.getByText(textMock('resourceadm.listadmin_delete_list'));
    await act(() => user.click(deleteListButton));

    const confirmDeleteButton = screen.getAllByText(textMock('resourceadm.listadmin_delete_list'));
    await act(() => user.click(confirmDeleteButton[0]));

    expect(mockedNavigate).toHaveBeenCalledWith('/listadmin');
  });

  it('should close modal on cancel delete', async () => {
    const addPartyListMemberMock = jest.fn();
    render({}, { addPartyListMember: addPartyListMemberMock });

    const deleteListButton = screen.getByText(textMock('resourceadm.listadmin_delete_list'));
    await act(() => user.click(deleteListButton));

    const cancelDeleteButton = screen.getByText(textMock('general.cancel'));
    await act(() => user.click(cancelDeleteButton));

    expect(
      screen.queryByText(textMock('resourceadm.listadmin_delete_list_header')),
    ).not.toBeInTheDocument();
  });
});

const render = (
  props: Partial<PartyListDetailProps> = {},
  queries: Partial<ServicesContextProps> = {},
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <PartyListDetail {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

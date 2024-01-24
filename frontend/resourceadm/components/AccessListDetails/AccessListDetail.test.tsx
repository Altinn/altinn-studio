import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { AccessListDetailProps } from './AccessListDetail';
import { AccessListDetail } from './AccessListDetail';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

const testOrg = 'ttd';
const testEnv = 'tt02';
const testListIdentifier = 'listid';

const defaultProps: AccessListDetailProps = {
  org: testOrg,
  env: testEnv,
  list: {
    env: testEnv,
    identifier: testListIdentifier,
    name: 'Test-list',
    description: 'This is a description',
    members: [],
  },
  backUrl: '/listadmin',
};

const updateAccessListMock = jest.fn();
const addAccessListMemberMock = jest.fn();

describe('AccessListDetail', () => {
  afterEach(jest.clearAllMocks);

  it('should call service to update name', async () => {
    const user = userEvent.setup();
    renderAccessListDetail({}, { updateAccessList: updateAccessListMock });

    const nameField = screen.getByLabelText(textMock('resourceadm.listadmin_list_name'));
    await act(() => user.type(nameField, ' change'));
    await act(() => nameField.blur());

    expect(updateAccessListMock).toHaveBeenCalledWith(testOrg, testListIdentifier, testEnv, [
      { op: 'replace', path: '/name', value: 'Test-list change' },
    ]);
  });

  it('should call service to update description', async () => {
    const user = userEvent.setup();
    renderAccessListDetail({}, { updateAccessList: updateAccessListMock });

    const descriptionField = screen.getByLabelText(
      textMock('resourceadm.listadmin_list_description'),
    );
    await act(() => user.type(descriptionField, ' change'));
    await act(() => descriptionField.blur());

    expect(updateAccessListMock).toHaveBeenCalledWith(testOrg, testListIdentifier, testEnv, [
      { op: 'replace', path: '/description', value: 'This is a description change' },
    ]);
  });

  it('should call service to remove description', async () => {
    const user = userEvent.setup();
    renderAccessListDetail({}, { updateAccessList: updateAccessListMock });

    const descriptionField = screen.getByLabelText(
      textMock('resourceadm.listadmin_list_description'),
    );
    await act(() => user.clear(descriptionField));
    await act(() => descriptionField.blur());

    expect(updateAccessListMock).toHaveBeenCalledWith(testOrg, testListIdentifier, testEnv, [
      { op: 'remove', path: '/description' },
    ]);
  });

  it('should navigate back after list is deleted', async () => {
    const user = userEvent.setup();
    renderAccessListDetail({}, { addAccessListMember: addAccessListMemberMock });

    const deleteListButton = screen.getByText(textMock('resourceadm.listadmin_delete_list'));
    await act(() => user.click(deleteListButton));

    const confirmDeleteButton = screen.getAllByText(textMock('resourceadm.listadmin_delete_list'));
    await act(() => user.click(confirmDeleteButton[0]));

    expect(mockedNavigate).toHaveBeenCalledWith('/listadmin');
  });

  it('should close modal on cancel delete', async () => {
    const user = userEvent.setup();
    renderAccessListDetail({}, { addAccessListMember: addAccessListMemberMock });

    const deleteListButton = screen.getByText(textMock('resourceadm.listadmin_delete_list'));
    await act(() => user.click(deleteListButton));

    const cancelDeleteButton = screen.getByText(textMock('general.cancel'));
    await act(() => user.click(cancelDeleteButton));

    expect(
      screen.queryByText(textMock('resourceadm.listadmin_delete_list_header')),
    ).not.toBeInTheDocument();
  });
});

const renderAccessListDetail = (
  props: Partial<AccessListDetailProps> = {},
  queries: Partial<ServicesContextProps> = {},
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <AccessListDetail {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
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
  },
  backUrl: '/listadmin',
};

const membersPage2OrgNr = '987654321';
const membersResults = {
  data: [{ orgNr: '123456789', orgName: 'Skatteetaten', isSubParty: false }],
  nextPage: 'http://at22-next-page',
};

const membersResultsPage2 = {
  data: [{ orgNr: membersPage2OrgNr, orgName: 'Digitaliseringsdirektoratet', isSubParty: false }],
  nextPage: '',
};

const updateAccessListMock = jest.fn();

describe('AccessListDetail', () => {
  afterEach(jest.clearAllMocks);

  it('should call service to update name', async () => {
    const user = userEvent.setup();
    renderAccessListDetail({}, { updateAccessList: updateAccessListMock });

    const nameField = screen.getByLabelText(textMock('resourceadm.listadmin_list_name'));
    await user.type(nameField, ' change');
    await waitFor(() => nameField.blur());

    expect(updateAccessListMock).toHaveBeenCalledWith(testOrg, testListIdentifier, testEnv, {
      ...defaultProps.list,
      name: 'Test-list change',
    });
  });

  it('should show error message if call to update name returns http status code 412', async () => {
    const user = userEvent.setup();
    const updateMock = jest.fn().mockImplementation(() =>
      Promise.reject({
        response: { status: 412 },
      }),
    );
    renderAccessListDetail({}, { updateAccessList: updateMock });

    const nameField = screen.getByLabelText(textMock('resourceadm.listadmin_list_name'));
    await user.type(nameField, ' change');
    await waitFor(() => nameField.blur());

    expect(
      screen.getByText(textMock('resourceadm.listadmin_list_sim_update_error')),
    ).toBeInTheDocument();
  });

  it('should call service to update description', async () => {
    const user = userEvent.setup();
    renderAccessListDetail({}, { updateAccessList: updateAccessListMock });

    const descriptionField = screen.getByLabelText(
      textMock('resourceadm.listadmin_list_description'),
    );
    await user.type(descriptionField, ' change');
    await waitFor(() => descriptionField.blur());

    expect(updateAccessListMock).toHaveBeenCalledWith(testOrg, testListIdentifier, testEnv, {
      ...defaultProps.list,
      description: 'This is a description change',
    });
  });

  it('should call service to remove description', async () => {
    const user = userEvent.setup();
    renderAccessListDetail({}, { updateAccessList: updateAccessListMock });

    const descriptionField = screen.getByLabelText(
      textMock('resourceadm.listadmin_list_description'),
    );
    await user.clear(descriptionField);
    await waitFor(() => descriptionField.blur());

    expect(updateAccessListMock).toHaveBeenCalledWith(testOrg, testListIdentifier, testEnv, {
      ...defaultProps.list,
      description: '',
    });
  });

  it('should navigate back after list is deleted', async () => {
    const user = userEvent.setup();
    renderAccessListDetail();

    const deleteListButton = screen.getByText(textMock('resourceadm.listadmin_delete_list'));
    await user.click(deleteListButton);

    const confirmDeleteButton = screen.getAllByText(textMock('resourceadm.listadmin_delete_list'));
    await user.click(confirmDeleteButton[0]);

    expect(mockedNavigate).toHaveBeenCalledWith('/listadmin');
  });

  it('should close modal on cancel delete', async () => {
    const user = userEvent.setup();
    renderAccessListDetail();

    const deleteListButton = screen.getByText(textMock('resourceadm.listadmin_delete_list'));
    await user.click(deleteListButton);

    const cancelDeleteButton = screen.getByText(textMock('general.cancel'));
    await user.click(cancelDeleteButton);

    expect(
      screen.queryByText(textMock('resourceadm.listadmin_delete_list_header')),
    ).not.toBeInTheDocument();
  });

  it('should show more members when load more button is clicked', async () => {
    const user = userEvent.setup();
    const getAccessListMembersMock = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve(membersResults))
      .mockImplementationOnce(() => Promise.resolve(membersResultsPage2));
    renderAccessListDetail({}, { getAccessListMembers: getAccessListMembersMock });

    await waitFor(() =>
      screen.findByText(
        textMock('resourceadm.listadmin_load_more', {
          unit: textMock('resourceadm.listadmin_member_unit'),
        }),
      ),
    );

    const loadMoreButton = screen.getByText(
      textMock('resourceadm.listadmin_load_more', {
        unit: textMock('resourceadm.listadmin_member_unit'),
      }),
    );
    await user.click(loadMoreButton);

    expect(await screen.findByText(membersPage2OrgNr)).toBeInTheDocument();
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

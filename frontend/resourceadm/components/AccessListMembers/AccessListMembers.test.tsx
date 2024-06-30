import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { AccessListMembersProps } from './AccessListMembers';
import { AccessListMembers } from './AccessListMembers';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

const testOrg = 'ttd';
const testEnv = 'tt02';
const testListIdentifier = 'listid';
const testMemberPartyId = '123456789';

const membersPage2OrgNr = '987654321';
const membersResults = {
  data: [
    { orgNr: testMemberPartyId, orgName: '', isSubParty: false },
    { orgNr: '112233445', orgName: 'test', isSubParty: true },
  ],
  nextPage: 'http://at22-next-page',
};

const membersResultsPage2 = {
  data: [{ orgNr: membersPage2OrgNr, orgName: 'Digitaliseringsdirektoratet', isSubParty: false }],
  nextPage: '',
};

const defaultProps: AccessListMembersProps = {
  org: testOrg,
  env: testEnv,
  list: {
    env: testEnv,
    identifier: testListIdentifier,
    name: 'Test-list',
    description: 'This is a description',
  },
  latestEtag: '',
  setLatestEtag: jest.fn(),
};

describe('AccessListMembers', () => {
  afterEach(jest.clearAllMocks);

  it('should show special party name if name is not found', async () => {
    await renderAndWaitForData();
    expect(screen.getByText(textMock('resourceadm.listadmin_empty_name'))).toBeInTheDocument();
  });

  it('should show message when list is empty', async () => {
    const getAccessListMembersMock = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ data: [] }));
    renderAccessListMembers({ getAccessListMembers: getAccessListMembersMock });

    await waitFor(() => screen.findByText(textMock('resourceadm.listadmin_empty_list')));
  });

  it('should remove member from table when remove member button is clicked', async () => {
    const user = userEvent.setup();
    const removeAccessListMemberMock = jest.fn().mockImplementation(() => Promise.resolve({}));
    await renderAndWaitForData({
      removeAccessListMember: removeAccessListMemberMock,
    });

    const removeButtons = screen.getAllByText(textMock('resourceadm.listadmin_remove_from_list'));
    await user.click(removeButtons[0]);

    expect(removeAccessListMemberMock).toHaveBeenCalledWith(testOrg, testListIdentifier, testEnv, {
      data: [testMemberPartyId],
      etag: '',
    });
  });

  it('should show new member in list after member is added', async () => {
    const user = userEvent.setup();
    const addAccessListMemberMock = jest.fn().mockImplementation(() => Promise.resolve({}));

    const searchResultText = 'Digdir';
    const searchResultOrgNr = '987654321';
    await renderAndWaitForData({
      addAccessListMember: addAccessListMemberMock,
      getParties: jest.fn().mockImplementation(() =>
        Promise.resolve({
          _embedded: {
            enheter: [{ organisasjonsnummer: searchResultOrgNr, navn: searchResultText }],
          },
        }),
      ),
    });
    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await user.click(addMoreButton);

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await user.type(textField, 'test');

    await waitFor(() => screen.findByText(searchResultText));

    const addMemberButton = screen.getByText(textMock('resourceadm.listadmin_add_to_list'));
    await user.click(addMemberButton);

    expect(addAccessListMemberMock).toHaveBeenCalledWith(testOrg, testListIdentifier, testEnv, {
      data: [searchResultOrgNr],
      etag: '',
    });
    await waitFor(() => expect(screen.getAllByText(searchResultOrgNr).length).toBe(2));
  });

  it('should show message when no parties are found', async () => {
    const user = userEvent.setup();

    await renderAndWaitForData({
      getParties: jest.fn().mockImplementation(() => Promise.resolve({})),
    });

    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await user.click(addMoreButton);

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await user.type(textField, 'test');

    await screen.findByText(textMock('resourceadm.listadmin_search_no_parties'));
  });

  it('should show message when no sub parties are found', async () => {
    const user = userEvent.setup();

    await renderAndWaitForData({
      getSubParties: jest.fn().mockImplementation(() => Promise.resolve({})),
    });

    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await user.click(addMoreButton);

    const subPartyRadioButton = screen.getByLabelText(
      textMock('resourceadm.listadmin_sub_parties'),
    );
    await user.click(subPartyRadioButton);

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await user.type(textField, 'test');

    await screen.findByText(textMock('resourceadm.listadmin_search_no_sub_parties'));
  });

  it('should show special organization from tenor when search for orgnr is not found', async () => {
    const user = userEvent.setup();

    await renderAndWaitForData({
      getParties: jest.fn().mockImplementation(() => Promise.resolve({})),
    });

    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await user.click(addMoreButton);

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await user.type(textField, '123456789');

    await screen.findByText(textMock('resourceadm.listadmin_list_tenor_org'));
  });

  it('should show error message if organization cannot be added to list', async () => {
    const user = userEvent.setup();
    const searchResultText = 'Digdir';
    const searchResultOrgNr = '987654321';

    await renderAndWaitForData({
      addAccessListMember: jest
        .fn()
        .mockImplementation(() => Promise.reject({ response: { data: { code: 'RR-00001' } } })),
      getParties: jest.fn().mockImplementation(() =>
        Promise.resolve({
          _embedded: {
            enheter: [{ organisasjonsnummer: searchResultOrgNr, navn: searchResultText }],
          },
        }),
      ),
    });

    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await user.click(addMoreButton);

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await user.type(textField, searchResultOrgNr);

    await waitFor(() => screen.findByText(searchResultText));

    const addMemberButton = screen.getByText(textMock('resourceadm.listadmin_add_to_list'));
    await user.click(addMemberButton);

    await waitFor(() => screen.findByText(textMock('resourceadm.listadmin_invalid_org')));
  });

  it('should show error message if add member request returns http status code 412', async () => {
    const user = userEvent.setup();
    const searchResultText = 'Digdir';
    const searchResultOrgNr = '987654321';

    await renderAndWaitForData({
      addAccessListMember: jest
        .fn()
        .mockImplementation(() =>
          Promise.reject({ response: { status: ServerCodes.PreconditionFailed, data: {} } }),
        ),
      getParties: jest.fn().mockImplementation(() =>
        Promise.resolve({
          _embedded: {
            enheter: [{ organisasjonsnummer: searchResultOrgNr, navn: searchResultText }],
          },
        }),
      ),
    });

    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await user.click(addMoreButton);

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await user.type(textField, searchResultOrgNr);

    await waitFor(() => screen.findByText(searchResultText));

    const addMemberButton = screen.getByText(textMock('resourceadm.listadmin_add_to_list'));
    await user.click(addMemberButton);

    expect(
      screen.getByText(textMock('resourceadm.listadmin_list_sim_update_error')),
    ).toBeInTheDocument();
  });

  it('should show error message if remove member request returns http status code 412', async () => {
    const user = userEvent.setup();

    await renderAndWaitForData({
      removeAccessListMember: jest
        .fn()
        .mockImplementation(() =>
          Promise.reject({ response: { status: ServerCodes.PreconditionFailed, data: {} } }),
        ),
    });

    const removeButtons = screen.getAllByText(textMock('resourceadm.listadmin_remove_from_list'));
    await user.click(removeButtons[0]);

    expect(
      screen.getByText(textMock('resourceadm.listadmin_list_sim_update_error')),
    ).toBeInTheDocument();
  });

  it('should go to next page when paging button is clicked', async () => {
    const user = userEvent.setup();
    const nextPageUrl = 'brreg/next';
    const searchResultText = 'Digdir';

    const getSubPartiesMock = jest.fn().mockImplementation(() =>
      Promise.resolve({
        _embedded: {
          underenheter: [{ organisasjonsnummer: '112233445', navn: searchResultText }],
        },
        _links: {
          first: { href: 'first' },
          prev: { href: 'first' },
          next: { href: nextPageUrl },
          last: { href: nextPageUrl },
        },
      }),
    );
    await renderAndWaitForData({
      getSubParties: getSubPartiesMock,
    });
    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await user.click(addMoreButton);

    const subPartyRadioButton = screen.getByLabelText(
      textMock('resourceadm.listadmin_sub_parties'),
    );
    await user.click(subPartyRadioButton);

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await user.type(textField, 'test');

    await waitFor(() => screen.findByText(searchResultText));

    const nextButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_next'),
    });
    await user.click(nextButton);

    expect(getSubPartiesMock).toHaveBeenCalledWith(nextPageUrl);
  });

  it('should show correct paging information', async () => {
    const user = userEvent.setup();

    const searchResultText = 'Digdir';

    const getPartiesMock = jest.fn().mockImplementation(() =>
      Promise.resolve({
        _embedded: {
          enheter: [{ organisasjonsnummer: '987654321', navn: searchResultText }],
        },
        page: {
          number: 1,
          size: 5,
          totalElements: 8,
        },
      }),
    );
    await renderAndWaitForData({
      getParties: getPartiesMock,
    });

    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await user.click(addMoreButton);

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await user.type(textField, 'test');

    await waitFor(() => screen.findByText(searchResultText));

    expect(
      screen.getByText(
        textMock('resourceadm.listadmin_search_paging', {
          from: 6,
          to: 8,
          total: 8,
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should show more members when load more button is clicked', async () => {
    const user = userEvent.setup();
    const getAccessListMembersMock = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve(membersResults))
      .mockImplementationOnce(() => Promise.resolve(membersResultsPage2));
    await renderAndWaitForData({ getAccessListMembers: getAccessListMembersMock });

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

const renderAccessListMembers = (queries: Partial<ServicesContextProps> = {}) => {
  const defaultGetAccessListMembersMock = jest
    .fn()
    .mockImplementation(() => Promise.resolve(membersResults));

  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getAccessListMembers: defaultGetAccessListMembersMock,
    ...queries,
  };

  render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <AccessListMembers {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

const renderAndWaitForData = async (queries: Partial<ServicesContextProps> = {}) => {
  renderAccessListMembers(queries);
  await waitFor(() => screen.findByText(testMemberPartyId));
};

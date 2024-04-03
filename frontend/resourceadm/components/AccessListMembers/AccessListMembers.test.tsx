import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { AccessListMembersProps } from './AccessListMembers';
import { AccessListMembers } from './AccessListMembers';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const testOrg = 'ttd';
const testEnv = 'tt02';
const testListIdentifier = 'listid';
const testMemberPartyId = '123456789';

const defaultProps: AccessListMembersProps = {
  org: testOrg,
  env: testEnv,
  list: {
    env: testEnv,
    identifier: testListIdentifier,
    name: 'Test-list',
    description: 'This is a description',
    members: [
      {
        orgNr: testMemberPartyId,
        orgName: '',
        isSubParty: false,
      },
      {
        orgNr: '112233445',
        orgName: 'test',
        isSubParty: true,
      },
    ],
  },
};

describe('AccessListMembers', () => {
  afterEach(jest.clearAllMocks);

  it('should show special party name if name is not found', () => {
    renderAccessListMembers();
    expect(screen.getByText(textMock('resourceadm.listadmin_empty_name'))).toBeInTheDocument();
  });

  it('should show message when list is empty', () => {
    renderAccessListMembers({ list: { ...defaultProps.list, members: undefined } });
    expect(screen.getByText(textMock('resourceadm.listadmin_empty_list'))).toBeInTheDocument();
  });

  it('should call service to remove member', async () => {
    const user = userEvent.setup();
    const removeAccessListMemberMock = jest.fn();
    renderAccessListMembers({}, { removeAccessListMember: removeAccessListMemberMock });

    const removeButtons = screen.getAllByText(textMock('resourceadm.listadmin_remove_from_list'));
    await act(() => user.click(removeButtons[0]));

    expect(removeAccessListMemberMock).toHaveBeenCalledWith(
      testOrg,
      testListIdentifier,
      testMemberPartyId,
      testEnv,
    );
  });

  it('should call service to add member', async () => {
    const user = userEvent.setup();
    const addAccessListMemberMock = jest.fn();
    const searchResultText = 'Digdir';
    const searchResultOrgNr = '987654321';
    renderAccessListMembers(
      {},
      {
        addAccessListMember: addAccessListMemberMock,
        getParties: jest.fn().mockImplementation(() =>
          Promise.resolve({
            _embedded: {
              enheter: [{ organisasjonsnummer: searchResultOrgNr, navn: searchResultText }],
            },
          }),
        ),
      },
    );
    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await act(() => user.click(addMoreButton));

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await act(() => user.type(textField, 'test'));

    await waitFor(() => screen.findByText(searchResultText));

    const searchResultsButton = screen.getByText(textMock('resourceadm.listadmin_add_to_list'));
    await act(() => user.click(searchResultsButton));

    expect(addAccessListMemberMock).toHaveBeenCalledWith(
      testOrg,
      testListIdentifier,
      searchResultOrgNr,
      testEnv,
    );
  });

  it('should show message when no parties are found', async () => {
    const user = userEvent.setup();

    renderAccessListMembers(
      {},
      {
        getParties: jest.fn().mockImplementation(() => Promise.resolve({})),
      },
    );

    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await act(() => user.click(addMoreButton));

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await act(() => user.type(textField, '123456789'));

    await screen.findByText(textMock('resourceadm.listadmin_search_no_parties'));
  });

  it('should show message when no sub parties are found', async () => {
    const user = userEvent.setup();

    renderAccessListMembers(
      {},
      {
        getSubParties: jest.fn().mockImplementation(() => Promise.resolve({})),
      },
    );

    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await act(() => user.click(addMoreButton));

    const subPartyRadioButton = screen.getByLabelText(
      textMock('resourceadm.listadmin_sub_parties'),
    );
    await act(() => user.click(subPartyRadioButton));

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await act(() => user.type(textField, 'test'));

    await screen.findByText(textMock('resourceadm.listadmin_search_no_sub_parties'));
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
    renderAccessListMembers(
      {},
      {
        getSubParties: getSubPartiesMock,
      },
    );
    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await act(() => user.click(addMoreButton));

    const subPartyRadioButton = screen.getByLabelText(
      textMock('resourceadm.listadmin_sub_parties'),
    );
    await act(() => user.click(subPartyRadioButton));

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await act(() => user.type(textField, 'test'));

    await waitFor(() => screen.findByText(searchResultText));

    const nextButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_next'),
    });
    await act(() => user.click(nextButton));

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
    renderAccessListMembers(
      {},
      {
        getParties: getPartiesMock,
      },
    );

    const addMoreButton = screen.getByRole('button', {
      name: textMock('resourceadm.listadmin_search_add_more'),
    });
    await act(() => user.click(addMoreButton));

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await act(() => user.type(textField, 'test'));

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
});

const renderAccessListMembers = (
  props: Partial<AccessListMembersProps> = {},
  queries: Partial<ServicesContextProps> = {},
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <AccessListMembers {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

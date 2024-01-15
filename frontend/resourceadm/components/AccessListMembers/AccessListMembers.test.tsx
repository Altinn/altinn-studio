import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { AccessListMembers, AccessListMembersProps } from './AccessListMembers';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const testOrg = 'ttd';
const testEnv = 'tt02';
const testListIdentifier = 'listid';
const testMemberPartyId = '123456789';

const defaultProps = {
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
    ],
  },
};

describe('AccessListMembers', () => {
  it('should show special party name if name is not found', () => {
    render();
    expect(screen.getByText(textMock('resourceadm.listadmin_empty_name'))).toBeInTheDocument();
  });

  it('should show message when list is empty', () => {
    render({ list: { ...defaultProps.list, members: [] } });
    expect(screen.getByText(textMock('resourceadm.listadmin_empty_list'))).toBeInTheDocument();
  });

  it('should call service to remove member', async () => {
    const user = userEvent.setup();
    const removeAccessListMemberMock = jest.fn();
    render({}, { removeAccessListMember: removeAccessListMemberMock });

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
    render(
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

  it('should search for sub parties when radio button is changed', async () => {
    const user = userEvent.setup();

    render(
      {},
      {
        getSubParties: jest.fn().mockImplementation(() =>
          Promise.resolve({
            _embedded: {
              underenheter: [{ organisasjonsnummer: '987654321', navn: 'subParty' }],
            },
          }),
        ),
      },
    );

    const subPartyRadioButton = screen.getByLabelText(
      textMock('resourceadm.listadmin_sub_parties'),
    );
    await act(() => user.click(subPartyRadioButton));

    const textField = screen.getByLabelText(textMock('resourceadm.listadmin_search'));
    await act(() => user.type(textField, 'test'));

    await screen.findByText(textMock('resourceadm.listadmin_sub_party'));
  });
});

const render = (
  props: Partial<AccessListMembersProps> = {},
  queries: Partial<ServicesContextProps> = {},
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <AccessListMembers {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

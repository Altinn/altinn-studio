import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { AccessListSearch } from './AccessListSearch';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const handleAddMemberMock = jest.fn();

const defaultProps = {
  existingMembers: [
    {
      orgNr: '123456789',
      orgName: '',
      isSubParty: false,
    },
  ],
  handleAddMember: handleAddMemberMock,
};

const testSubParty = {
  orgNr: '987654321',
  orgName: 'Under Digdir',
};

const user = userEvent.setup();

describe('AccessListSearch', () => {
  it('should call handleAddMember when access is selected', async () => {
    render({
      getParties: jest.fn().mockImplementation(() =>
        Promise.resolve({
          _embedded: {
            enheter: [{ organisasjonsnummer: '123456789', navn: 'Digdir' }],
          },
        }),
      ),
      getSubParties: jest.fn().mockImplementation(() =>
        Promise.resolve({
          _embedded: {
            underenheter: [{ organisasjonsnummer: testSubParty.orgNr, navn: testSubParty.orgName }],
          },
        }),
      ),
    });

    const searchField = screen.getByTestId('party-search');
    await act(() => user.type(searchField, 'Digdir'));

    const subPartyString = `${testSubParty.orgNr} - ${testSubParty.orgName}`;
    await waitFor(() => screen.findByText(subPartyString));
    const searchResultsButton = screen.getByText(subPartyString);
    await act(() => user.click(searchResultsButton));

    expect(handleAddMemberMock).toHaveBeenCalledWith({
      orgNr: testSubParty.orgNr,
      orgName: testSubParty.orgName,
      isSubParty: true,
    });
  });

  it('should show spinner when loading parties', async () => {
    render({
      getParties: jest.fn().mockImplementation(() => Promise.resolve({})),
      getSubParties: jest.fn().mockImplementation(() => Promise.resolve({})),
    });

    const searchField = screen.getByTestId('party-search');
    await act(() => user.type(searchField, 'Digdir'));
    await waitFor(() => {
      expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
    });
  });

  it('should show message when no parties are found', async () => {
    render({
      getParties: jest.fn().mockImplementation(() => Promise.resolve({})),
      getSubParties: jest.fn().mockImplementation(() => Promise.resolve({})),
    });

    const searchField = screen.getByTestId('party-search');
    await act(() => user.type(searchField, 'Digdir'));

    await waitFor(() => {
      expect(
        screen.getByText(textMock('resourceadm.listadmin_search_no_parties')),
      ).toBeInTheDocument();
    });
  });

  it('should search with special request when searching for a 9-digit number', async () => {
    const getPartiesMock = jest.fn().mockImplementation(() =>
      Promise.resolve({
        _embedded: {
          enheter: [{ organisasjonsnummer: '123456789', navn: 'Digdir' }],
        },
      }),
    );
    render({
      getParties: getPartiesMock,
      getSubParties: jest.fn().mockImplementation(() =>
        Promise.resolve({
          _embedded: {
            underenheter: [{ organisasjonsnummer: testSubParty.orgNr, navn: testSubParty.orgName }],
          },
        }),
      ),
    });

    const searchField = screen.getByTestId('party-search');
    await act(() => user.type(searchField, '123456789'));

    const subPartyString = `${testSubParty.orgNr} - ${testSubParty.orgName}`;
    await waitFor(() => screen.findByText(subPartyString));

    expect(getPartiesMock).toHaveBeenCalledWith(
      'https://data.brreg.no/enhetsregisteret/api/enheter?organisasjonsnummer=123456789&sort=navn,ASC',
    );
  });
});

const render = (queries: Partial<ServicesContextProps> = {}) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <AccessListSearch {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

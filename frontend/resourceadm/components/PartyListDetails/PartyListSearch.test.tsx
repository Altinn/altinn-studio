import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { PartyListSearch } from './PartyListSearch';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const enhetSearchResult = {
  _embedded: {
    enheter: [{ organisasjonsnummer: '123456789', navn: 'Digdir' }],
  },
};

const underenhetSearchResult = {
  _embedded: {
    underenheter: [{ organisasjonsnummer: '987654321', navn: 'Under Digdir' }],
  },
};

const handleAddMemberMock = jest.fn();

const defaultProps = {
  existingMembers: [
    {
      orgNr: '123456789',
      orgName: '',
      isUnderenhet: false,
    },
  ],
  handleAddMember: handleAddMemberMock,
};

const user = userEvent.setup();

describe('PartyListSearch', () => {
  it('should call handleAddMember when enhet is selected', async () => {
    render();

    const searchField = screen.getByTestId('enhet-search');
    await act(() => user.type(searchField, 'Digdir'));

    await waitFor(() => screen.findByText('987654321 - Under Digdir'));
    const searchResultsButton = screen.getByText('987654321 - Under Digdir');
    await act(() => user.click(searchResultsButton));

    expect(handleAddMemberMock).toHaveBeenCalled();
  });

  it('should show spinner when loading enheter', async () => {
    render();

    const searchField = screen.getByTestId('enhet-search');
    await act(() => user.type(searchField, 'Digdir'));
    await waitFor(() => {
      expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
    });
  });
});

const render = () => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getEnheter: jest.fn().mockImplementation(() => Promise.resolve(enhetSearchResult)),
    getUnderenheter: jest.fn().mockImplementation(() => Promise.resolve(underenhetSearchResult)),
  };

  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <PartyListSearch {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

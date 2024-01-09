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
            underenheter: [{ organisasjonsnummer: '987654321', navn: 'Under Digdir' }],
          },
        }),
      ),
    });

    const searchField = screen.getByTestId('party-search');
    await act(() => user.type(searchField, 'Digdir'));

    await waitFor(() => screen.findByText('987654321 - Under Digdir'));
    const searchResultsButton = screen.getByText('987654321 - Under Digdir');
    await act(() => user.click(searchResultsButton));

    expect(handleAddMemberMock).toHaveBeenCalled();
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
      expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
    });
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

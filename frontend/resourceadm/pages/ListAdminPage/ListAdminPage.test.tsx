import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ListAdminPage } from './ListAdminPage';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const partyListResults = [
  { env: 'tt02', identifier: 'listid', name: 'Test-list', description: 'Test-list description' },
];

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
  useParams: () => {
    return {
      selectedContext: 'org',
      env: 'tt02',
    };
  },
}));

const user = userEvent.setup();

describe('PartyListSearch', () => {
  it('should show lists after environment is selected', async () => {
    render();

    expect(await screen.findByText('Test-list')).toBeInTheDocument();
  });

  it('should change environment on toggle button click', async () => {
    render();

    const prodEnvButton = screen.getByText('PROD');
    await act(() => user.click(prodEnvButton));

    expect(mockedNavigate).toHaveBeenCalled();
  });

  it('should show create dialog when create new button is clicked', async () => {
    render();

    const createNewButton = screen.getByText('Opprett ny enhetsliste');
    await act(() => user.click(createNewButton));

    expect(screen.getByText('Lag ny enhetsliste i TT02')).toBeInTheDocument();
  });
});

const render = () => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getPartyLists: jest.fn().mockImplementation(() => Promise.resolve(partyListResults)),
  };

  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <ListAdminPage />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

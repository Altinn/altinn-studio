import React from 'react';
import { render as rtlRender, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { PartyListPage } from './PartyListPage';
import { textMock } from '../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    selectedContext: 'org1',
    env: 'tt02',
    listId: 'list1',
  }),
}));

describe('PartyListPage', () => {
  it('should show spinner on load', () => {
    render();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should show details page when list is loaded', async () => {
    render();

    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));

    expect(
      screen.getByText(textMock('resourceadm.listadmin_list_detail_header')),
    ).toBeInTheDocument();
  });
});

const render = () => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getPartyList: jest.fn().mockImplementation(() => Promise.resolve({})),
  };
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <PartyListPage />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

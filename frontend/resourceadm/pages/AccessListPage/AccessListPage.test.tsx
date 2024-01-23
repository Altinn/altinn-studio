import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AccessListPage } from './AccessListPage';
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
    accessListId: 'list1',
  }),
}));

describe('AccessListPage', () => {
  afterEach(jest.clearAllMocks);

  it('should show spinner on load', () => {
    renderAccessListPage();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should show details page when list is loaded', async () => {
    renderAccessListPage();

    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));

    expect(
      screen.getByText(textMock('resourceadm.listadmin_list_detail_header')),
    ).toBeInTheDocument();
  });

  it('should show error message is list loading fails', async () => {
    renderAccessListPage(true);

    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));

    expect(screen.getByText(textMock('resourceadm.listadmin_list_load_error'))).toBeInTheDocument();
  });
});

const renderAccessListPage = (isLoadError?: boolean) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getAccessList: jest
      .fn()
      .mockImplementation(() => (isLoadError ? Promise.reject({}) : Promise.resolve({}))),
  };
  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <AccessListPage />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

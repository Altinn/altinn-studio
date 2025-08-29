import React from 'react';
import { MemoryRouter, useParams } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ListAdminPage } from './ListAdminPage';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const accessListResults = {
  data: [
    { env: 'tt02', identifier: 'listid', name: 'Test-list', description: 'Test-list description' },
  ],
  nextPage: 'http://at22-next-page',
};

const accessListResultsPage2 = {
  data: [
    {
      env: 'tt02',
      identifier: 'listid2',
      name: 'Test-list2',
      description: 'Test-list description2',
    },
  ],
  nextPage: '',
};

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
  useParams: jest.fn(),
}));

describe('ListAdminPage', () => {
  afterEach(jest.clearAllMocks);

  it('should navigate to first available enviromnent if no environment is selected', async () => {
    (useParams as jest.Mock).mockReturnValue({
      org: 'ttd',
    });
    renderListAdminPage();

    expect(mockedNavigate).toHaveBeenCalledWith(`/ttd/ttd-resources/accesslists/tt02/`, {
      replace: true,
    });
  });

  it('should show lists after environment is selected', async () => {
    (useParams as jest.Mock).mockReturnValue({
      org: 'ttd',
      env: 'tt02',
    });
    renderListAdminPage();

    expect(await screen.findByText('Test-list')).toBeInTheDocument();
  });

  it('should change environment on toggle button click', async () => {
    (useParams as jest.Mock).mockReturnValue({
      org: 'ttd',
      env: 'tt02',
    });
    const user = userEvent.setup();
    renderListAdminPage();

    const prodEnvButton = screen.getByText(textMock('resourceadm.deploy_prod_env'));
    await user.click(prodEnvButton);

    expect(mockedNavigate).toHaveBeenCalledWith(`/ttd/ttd-resources/accesslists/prod/`, {
      replace: undefined,
    });
  });

  it('should show create dialog when create new button is clicked', async () => {
    (useParams as jest.Mock).mockReturnValue({
      org: 'ttd',
      env: 'tt02',
    });
    const user = userEvent.setup();
    renderListAdminPage();

    const createNewButton = screen.getByText(textMock('resourceadm.listadmin_create_list'));
    await user.click(createNewButton);

    expect(
      screen.getByText(
        textMock('resourceadm.listadmin_create_list_header', {
          env: textMock('resourceadm.deploy_test_env'),
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should load more lists when load more button is clicked', async () => {
    (useParams as jest.Mock).mockReturnValue({
      org: 'ttd',
      env: 'tt02',
    });
    const user = userEvent.setup();
    renderListAdminPage();

    await waitFor(() =>
      screen.findByText(
        textMock('resourceadm.listadmin_load_more', {
          unit: textMock('resourceadm.listadmin_list_unit'),
        }),
      ),
    );
    await user.click(
      screen.getByText(
        textMock('resourceadm.listadmin_load_more', {
          unit: textMock('resourceadm.listadmin_list_unit'),
        }),
      ),
    );

    expect(await screen.findByText('Test-list2')).toBeInTheDocument();
  });

  it('should show error when user does not have permission to edit access lists', async () => {
    (useParams as jest.Mock).mockReturnValue({
      org: 'ttd',
      env: 'tt02',
    });

    renderListAdminPage(true);

    expect(
      await screen.findByText(
        textMock('resourceadm.loading_access_list_permission_denied', {
          envName: textMock('resourceadm.deploy_test_env'),
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should navigate back on back button click', async () => {
    (useParams as jest.Mock).mockReturnValue({
      org: 'ttd',
    });

    const user = userEvent.setup();
    renderListAdminPage();

    const backLink = screen.getByRole('link', { name: textMock('resourceadm.listadmin_back') });
    await user.click(backLink);

    expect(mockedNavigate).toHaveBeenCalledWith('/ttd/ttd-resources');
  });
});

const renderListAdminPage = (isError?: boolean) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getAccessLists: isError
      ? jest.fn().mockImplementationOnce(() => Promise.reject({ response: { status: 403 } }))
      : jest
          .fn()
          .mockImplementationOnce(() => Promise.resolve(accessListResults))
          .mockImplementationOnce(() => Promise.resolve(accessListResultsPage2)),
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <ListAdminPage />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

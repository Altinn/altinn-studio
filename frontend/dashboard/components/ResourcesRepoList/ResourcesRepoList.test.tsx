import React from 'react';
import {
  act,
  render as rtlRender,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourcesRepoList } from './ResourcesRepoList';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { textMock } from '../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useParams } from 'react-router-dom';

const originalWindowLocation = window.location;
const user = userEvent.setup();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

const render = () => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getResourceList: jest.fn().mockImplementation(() =>
      Promise.resolve([
        {
          title: 'Test ressurs',
          createdBy: '',
          lastChanged: new Date().toISOString(),
          hasPolicy: true,
          identifier: 'test-ressurs',
        },
      ]),
    ),
  };
  return rtlRender(
    <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
      <ResourcesRepoList
        organizations={[
          {
            username: 'ttd',
            full_name: 'Testdepartementet',
            avatar_url: '',
            id: 1,
          },
        ]}
      />
    </ServicesContextProvider>,
  );
};

describe('RepoList', () => {
  beforeEach(() => {
    delete window.location;
    window.location = {
      ...originalWindowLocation,
      assign: jest.fn(),
    };
  });
  afterEach(() => {
    jest.clearAllMocks();
    window.location = originalWindowLocation;
  });

  test('Should not show component when context is all', () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'all',
    });
    render();
    expect(screen.queryByTestId('resource-table-wrapper')).not.toBeInTheDocument();
  });

  test('Should not show component when context is mine', () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'self',
    });
    render();
    expect(screen.queryByTestId('resource-table-wrapper')).not.toBeInTheDocument();
  });

  test('Should show spinner on loading', () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
    });
    render();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  test('Should show correct header', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
    });
    render();
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));

    expect(
      screen.getByText(textMock('dashboard.org_resources', { orgName: 'Testdepartementet' })),
    ).toBeInTheDocument();
  });

  test('Should have link to resources dashboard', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
    });
    render();
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));

    expect(
      screen.getByRole('link', { name: textMock('dashboard.go_to_resources') }),
    ).toHaveAttribute('href', '/resourceadm/ttd/ttd-resources');
  });

  test('Should navigate to resourceadm editor on resource edit click', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
    });
    render();
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));
    await act(() => user.click(screen.getByText(textMock('resourceadm.dashboard_table_row_edit'))));

    expect(window.location.assign).toHaveBeenCalledWith(
      '/resourceadm/ttd/ttd-resources/resource/test-ressurs/about',
    );
  });
});

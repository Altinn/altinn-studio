import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourcesRepoList } from './ResourcesRepoList';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { textMock } from '../../../testing/mocks/i18nMock';
import { useParams } from 'react-router-dom';
import type { User } from 'app-shared/types/Repository';
import { MockServicesContextWrapper } from 'dashboard/dashboardTestUtils';

const originalWindowLocation = window.location;
const user = userEvent.setup();

const searchReposResponse = {
  data: [{} as any],
  ok: true,
  totalCount: 1,
  totalPages: 1,
};
const getResourceListResponse = [
  {
    title: {
      nb: 'Test ressurs',
      nn: '',
      en: '',
    },
    createdBy: '',
    lastChanged: new Date().toISOString(),
    hasPolicy: true,
    identifier: 'test-ressurs',
  },
];

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

const renderWithMockServices = (services?: Partial<ServicesContextProps>) => {
  render(
    <MockServicesContextWrapper customServices={services}>
      <ResourcesRepoList
        user={{ id: 1 } as User}
        organizations={[
          {
            username: 'ttd',
            full_name: 'Testdepartementet',
            avatar_url: '',
            id: 1,
          },
        ]}
      />
    </MockServicesContextWrapper>,
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

  test('Should show spinner on loading', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
    });
    renderWithMockServices({
      searchRepos: () => Promise.resolve(searchReposResponse),
      getResourceList: () => Promise.resolve(getResourceListResponse),
    });

    await waitFor(() => {
      expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
    });
  });

  test('Should show error when loading fails', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
    });
    renderWithMockServices({
      searchRepos: () => Promise.resolve(searchReposResponse),
      getResourceList: () => Promise.reject(),
    });

    await waitFor(() => {
      expect(screen.getByText(textMock('dashboard.resource_list_load_error'))).toBeInTheDocument();
    });
  });

  test('Should show correct header', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
    });
    renderWithMockServices({
      searchRepos: () => Promise.resolve(searchReposResponse),
      getResourceList: () => Promise.resolve(getResourceListResponse),
    });
    await waitFor(() => {
      expect(screen.getByTestId('resource-table-wrapper')).toBeInTheDocument();
    });

    expect(
      screen.getByText(textMock('dashboard.org_resources', { orgName: 'Testdepartementet' })),
    ).toBeInTheDocument();
  });

  test('Should have link to resources dashboard', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
    });
    renderWithMockServices({
      searchRepos: () => Promise.resolve(searchReposResponse),
      getResourceList: () => Promise.resolve(getResourceListResponse),
    });
    await waitFor(() => {
      expect(screen.getByTestId('resource-table-wrapper')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('link', { name: textMock('dashboard.go_to_resources') }),
    ).toHaveAttribute('href', '/resourceadm/ttd/ttd-resources');
  });

  test('Should navigate to resourceadm editor on resource edit click', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: 'ttd',
    });
    renderWithMockServices({
      searchRepos: () => Promise.resolve(searchReposResponse),
      getResourceList: () => Promise.resolve(getResourceListResponse),
    });
    await waitFor(() => {
      expect(screen.getByTestId('resource-table-wrapper')).toBeInTheDocument();
    });

    await act(() => user.click(screen.getByText(textMock('resourceadm.dashboard_table_row_edit'))));

    expect(window.location.assign).toHaveBeenCalledWith(
      '/resourceadm/ttd/ttd-resources/resource/test-ressurs/about',
    );
  });
});

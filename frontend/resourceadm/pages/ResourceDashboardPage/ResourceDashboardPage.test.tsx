import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { ResourceDashboardPage } from './ResourceDashboardPage';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MemoryRouter } from 'react-router-dom';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { addFeatureFlagToLocalStorage } from 'app-shared/utils/featureToggleUtils';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { Organization } from 'app-shared/types/Organization';
import { organization } from 'app-shared/mocks/mocks';

const mockResourceListItem1: ResourceListItem = {
  title: { nb: 'resource 1', nn: '', en: '' },
  createdBy: 'John Doe',
  lastChanged: '2023-08-30',
  hasPolicy: true,
  identifier: 'r1',
};
const mockResourceListItem2: ResourceListItem = {
  title: { nb: 'resource 2', nn: '', en: '' },
  createdBy: 'John Doe',
  lastChanged: '2023-08-30',
  hasPolicy: true,
  identifier: 'r2',
};
const mockResourceListItem3: ResourceListItem = {
  title: { nb: 'resource 3', nn: '', en: '' },
  createdBy: 'John Doe',
  lastChanged: '2023-08-30',
  hasPolicy: false,
  identifier: 'r3',
};
const mockResourceListItem4: ResourceListItem = {
  title: { nb: 'resource 4', nn: '', en: '' },
  createdBy: 'John Doe',
  lastChanged: '2023-08-30',
  hasPolicy: true,
  identifier: 'r4',
};
const mockResourceListItem5: ResourceListItem = {
  title: { nb: 'resource 5', nn: '', en: '' },
  createdBy: 'John Doe',
  lastChanged: '2023-08-30',
  hasPolicy: false,
  identifier: 'r5',
};
const mockResourceList: ResourceListItem[] = [
  mockResourceListItem1,
  mockResourceListItem2,
  mockResourceListItem3,
  mockResourceListItem4,
  mockResourceListItem5,
];

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    selectedContext: 'ttd',
  }),
}));

describe('ResourceDashBoardPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('fetches resource list on mount', () => {
    renderResourceDashboardPage();
    expect(queriesMock.getResourceList).toHaveBeenCalledTimes(1);
  });

  it('shows correct organization header', async () => {
    const getOrganizations = jest.fn().mockImplementation(() =>
      Promise.resolve<Organization[]>([
        {
          ...organization,
          full_name: 'Testdepartementet',
          username: 'ttd',
        },
      ]),
    );
    renderResourceDashboardPage({ getOrganizations });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.dashboard_spinner')),
    );
    expect(
      screen.getByText(textMock('dashboard.org_resources', { orgName: 'Testdepartementet' })),
    ).toBeInTheDocument();
  });

  it('shows the loading state when page is loading', () => {
    renderResourceDashboardPage();
    expect(screen.getByTitle(textMock('resourceadm.dashboard_spinner'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: textMock('resourceadm.dashboard_num_resources', { num: mockResourceList.length }),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(textMock('resourceadm.dashboard_searchbox')),
    ).not.toBeInTheDocument();
  });

  it('does not show the spinner when the resource list is present', async () => {
    const getResourceList = jest
      .fn()
      .mockImplementation(() => Promise.resolve<ResourceListItem[]>(mockResourceList));
    renderResourceDashboardPage({ getResourceList });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.dashboard_spinner')),
    );
    expect(screen.queryByRole(textMock('resourceadm.dashboard_spinner'))).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: textMock('resourceadm.dashboard_num_resources', { num: mockResourceList.length }),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(textMock('resourceadm.dashboard_searchbox'))).toBeInTheDocument();
  });

  it('opens the import resource from altinn 2 modal on click', async () => {
    const user = userEvent.setup();
    const getResourceList = jest
      .fn()
      .mockImplementation(() => Promise.resolve<ResourceListItem[]>(mockResourceList));
    renderResourceDashboardPage({ getResourceList });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.dashboard_spinner')),
    );

    const modalTitle = screen.queryByRole('heading', {
      name: textMock('resourceadm.dashboard_import_modal_title'),
      level: 1,
    });
    expect(modalTitle).not.toBeInTheDocument();

    const importButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_import_resource'),
    });
    await act(() => user.click(importButton));

    expect(
      screen.getByRole('heading', {
        name: textMock('resourceadm.dashboard_import_modal_title'),
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it('opens the create new resource modal on click', async () => {
    const user = userEvent.setup();
    const getResourceList = jest
      .fn()
      .mockImplementation(() => Promise.resolve<ResourceListItem[]>(mockResourceList));
    renderResourceDashboardPage({ getResourceList });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.dashboard_spinner')),
    );

    const modalTitle = screen.queryByRole('heading', {
      name: textMock('resourceadm.dashboard_create_modal_title'),
      level: 1,
    });
    expect(modalTitle).not.toBeInTheDocument();

    const createButton = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_create_resource'),
    });
    await act(() => user.click(createButton));

    expect(
      screen.getByRole('heading', {
        name: textMock('resourceadm.dashboard_create_modal_title'),
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it('filters the resource list when the search value changes', async () => {
    const user = userEvent.setup();
    const getResourceList = jest
      .fn()
      .mockImplementation(() => Promise.resolve<ResourceListItem[]>(mockResourceList));
    renderResourceDashboardPage({ getResourceList });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.dashboard_spinner')),
    );

    const resourceRowsBeforeFilter = screen.getAllByRole('row'); // Also selects the <th />
    expect(resourceRowsBeforeFilter.length).toEqual(mockResourceList.length + 1); // Adding the <th />

    const searchInput = screen.getByLabelText(textMock('resourceadm.dashboard_searchbox'));
    await act(() => user.type(searchInput, mockResourceListItem1.title.nb));

    const resourceRowsAfterFilter = screen.getAllByRole('row'); // Also selects the <th />
    expect(resourceRowsAfterFilter.length).toBe(2); // The one data row + 1 <th />
  });

  it('does not display the error message when the list is not empty', async () => {
    const getResourceList = jest
      .fn()
      .mockImplementation(() => Promise.resolve<ResourceListItem[]>(mockResourceList));
    renderResourceDashboardPage({ getResourceList });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.dashboard_spinner')),
    );

    expect(
      screen.queryByText(textMock('resourceadm.dashboard_no_resources_result')),
    ).not.toBeInTheDocument();
  });

  it('displays empty list message when the list is empty', async () => {
    const user = userEvent.setup();
    const getResourceList = jest
      .fn()
      .mockImplementation(() => Promise.resolve<ResourceListItem[]>(mockResourceList));
    renderResourceDashboardPage({ getResourceList });
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.dashboard_spinner')),
    );

    const resourceRowsBeforeFilter = screen.getAllByRole('row'); // Also selects the <th />
    expect(resourceRowsBeforeFilter.length).toEqual(mockResourceList.length + 1); // Adding the <th />

    const searchInput = screen.getByLabelText(textMock('resourceadm.dashboard_searchbox'));
    await act(() => user.type(searchInput, 'text not in the list'));

    const resourceRowsAfterFilter = screen.getAllByRole('row'); // Also selects the <th />
    expect(resourceRowsAfterFilter.length).toBe(1); // Only the <th />

    expect(
      screen.getByText(textMock('resourceadm.dashboard_no_resources_result')),
    ).toBeInTheDocument();
  });

  it('should show access list button when feature is enabled', () => {
    addFeatureFlagToLocalStorage('resourceAccessLists');

    renderResourceDashboardPage();

    expect(
      screen.getByText(textMock('resourceadm.dashboard_change_organization_lists')),
    ).toBeInTheDocument();
  });
});

const renderResourceDashboardPage = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  return render(
    <MemoryRouter>
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        <ResourceDashboardPage />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

import React from 'react';
import { render as rtlRender, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { ResourceDashboardPage } from './ResourceDashboardPage';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { QueryClient } from '@tanstack/react-query';

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

const getResourceList = jest.fn().mockImplementation(() => Promise.resolve({}));
const getOrganizations = jest.fn().mockImplementation(() => Promise.resolve([]));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    selectedContext: 'ttd',
  }),
}));

// Mocking console.error due to Tanstack Query removing custom logger between V4 and v5 see issue: #11692
const realConsole = console;

describe('ResourceDashBoardPage', () => {
  beforeEach(() => {
    global.console = {
      ...console,
      error: jest.fn(),
    };
  });
  afterEach(() => {
    global.console = realConsole;
    jest.clearAllMocks();
  });
  it('fetches resource list on mount', () => {
    render();
    expect(getResourceList).toHaveBeenCalledTimes(1);
  });

  it('shows correct organization header', async () => {
    getOrganizations.mockImplementation(() =>
      Promise.resolve([
        {
          avatar_url: 'http://studio.localhost/repos/avatars/5d076e5c3d34cb8bb08e54a4bb7e223e',
          description: 'Internt organisasjon for test av løsning',
          full_name: 'Testdepartementet',
          id: 3,
          location: '',
          username: 'ttd',
          website: '',
        },
      ]),
    );
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.dashboard_spinner')),
    );
    expect(
      screen.getByText(textMock('dashboard.org_resources', { orgName: 'Testdepartementet' })),
    ).toBeInTheDocument();
  });

  it('shows the loading state when page is loading', () => {
    render();
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
    getResourceList.mockImplementation(() => Promise.resolve(mockResourceList));
    render();
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
    getResourceList.mockImplementation(() => Promise.resolve(mockResourceList));
    render();
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
    getResourceList.mockImplementation(() => Promise.resolve(mockResourceList));
    render();
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
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it('filters the resource list when the search value changes', async () => {
    const user = userEvent.setup();
    getResourceList.mockImplementation(() => Promise.resolve(mockResourceList));
    render();
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
    getResourceList.mockImplementation(() => Promise.resolve(mockResourceList));
    render();
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.dashboard_spinner')),
    );

    expect(
      screen.queryByText(textMock('resourceadm.dashboard_no_resources_result')),
    ).not.toBeInTheDocument();
  });

  it('displays empty list message when the list is empty', async () => {
    const user = userEvent.setup();
    getResourceList.mockImplementation(() => Promise.resolve(mockResourceList));
    render();
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
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getResourceList,
    getOrganizations,
    ...queries,
  };
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <ResourceDashboardPage />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};

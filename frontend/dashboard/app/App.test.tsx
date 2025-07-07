import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import type { MockServicesContextWrapperProps } from '../dashboardTestUtils';
import { MockServicesContextWrapper } from '../dashboardTestUtils';
import { App } from './App';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { repoStatus, user as userMock } from 'app-shared/mocks/mocks';
import type { QueryClient } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import type { Organization } from 'app-shared/types/Organization';
import { APP_DASHBOARD_BASENAME } from 'app-shared/constants';
import { FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';

jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

jest.mock('app-shared/utils/featureToggleUtils', () => ({
  ...jest.requireActual('app-shared/utils/featureToggleUtils'),
  shouldDisplayFeature: jest.fn().mockImplementation((flag) => flag === FeatureFlag.OrgLibrary),
}));

// Test data:
const org: Organization = {
  avatar_url: 'data:image/svg+xml;utf8,<svg></svg>',
  id: 1,
  username: 'some-org',
};

const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(repoStatus));
const customServices: ServicesContextProps = {
  ...queriesMock,
  getRepoStatus: mockGetRepoStatus,
};

describe('App', () => {
  beforeEach(jest.clearAllMocks);

  it('should display spinner while loading', () => {
    renderApp();
    expect(screen.getByText(textMock('dashboard.loading'))).toBeInTheDocument();
  });

  it('should display error when failing to fetch current user', async () => {
    renderApp({ customServices: { getUser: () => Promise.reject() } });
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: textMock('dashboard.error_getting_user_data.title'),
      }),
    ).toBeInTheDocument();
  });

  it('should display error when failing to fetch organizations', async () => {
    renderApp({ customServices: { getOrganizations: () => Promise.reject() } });
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: textMock('dashboard.error_getting_organization_data.title'),
      }),
    ).toBeInTheDocument();
  });

  it('should display dashboard page when data are loaded', async () => {
    renderApp();
    await waitForElementToBeRemoved(querySpinner());
    expect(screen.getByRole('link', { name: textMock('dashboard.header_item_dashboard') }));
    expect(screen.getByRole('link', { name: textMock('dashboard.header_item_library') }));
  });

  it('should display the apps overview by default', async () => {
    const client = createQueryClientWithUserAndOrg();
    renderApp({ client, customServices });
    expect(getFavouriteAppListHeading()).toBeInTheDocument();
  });

  it('should display the library when the user clicks on the library link', async () => {
    const user = userEvent.setup();
    const client = createQueryClientWithUserAndOrg();
    const initialEntries = [`${APP_DASHBOARD_BASENAME}/${org.username}`];
    renderApp({ client, customServices, initialEntries });

    await user.click(screen.getByRole('link', { name: textMock('dashboard.header_item_library') }));
    expect(getLibraryHeading()).toBeInTheDocument();
  });

  it('should display the apps overview when the user is on the library page and clicks on the apps link', async () => {
    const user = userEvent.setup();
    const client = createQueryClientWithUserAndOrg();
    const initialEntries = [`${APP_DASHBOARD_BASENAME}/${org.username}`];
    renderApp({ client, customServices, initialEntries });

    await user.click(screen.getByRole('link', { name: textMock('dashboard.header_item_library') }));
    await user.click(
      screen.getByRole('link', { name: textMock('dashboard.header_item_dashboard') }),
    );
    expect(getFavouriteAppListHeading()).toBeInTheDocument();
  });
});

type RenderAppArgs = Omit<MockServicesContextWrapperProps, 'children'>;

function renderApp(args: RenderAppArgs = {}): RenderResult {
  return render(<App />, {
    wrapper: ({ children }) => (
      <MockServicesContextWrapper {...args}>{children}</MockServicesContextWrapper>
    ),
  });
}

const querySpinner = (): HTMLElement | null => screen.queryByTitle(textMock('dashboard.loading'));

const getFavouriteAppListHeading = (): HTMLElement =>
  screen.getByRole('heading', { name: textMock('dashboard.favourites') });

const getLibraryHeading = (): HTMLElement =>
  screen.getByRole('heading', { name: textMock('org_content_library.library_heading') });

function createQueryClientWithUserAndOrg(): QueryClient {
  const client = createQueryClientMock();
  client.setQueryData([QueryKey.CurrentUser], userMock);
  client.setQueryData([QueryKey.Organizations], [org]);
  return client;
}

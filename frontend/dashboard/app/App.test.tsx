import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import type { MockServicesContextWrapperProps } from '../dashboardTestUtils';
import { MockServicesContextWrapper } from '../dashboardTestUtils';
import { App } from './App';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { user as userMock } from 'app-shared/mocks/mocks';
import type { QueryClient } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import type { Organization } from 'app-shared/types/Organization';
import { APP_DASHBOARD_BASENAME } from 'app-shared/constants';

jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

// Test data:
const org: Organization = {
  avatar_url: 'data:image/svg+xml;utf8,<svg></svg>',
  id: 1,
  username: 'some-org',
};

describe('App', () => {
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
    expect(screen.getByRole('link', { name: textMock('dashboard.apps') }));
    expect(screen.getByRole('link', { name: textMock('dashboard.library') }));
  });

  it('should display the apps overview by default', () => {
    const client = createQueryClientWithUserAndOrg();
    renderApp({ client });
    expect(getFavouriteAppListHeading()).toBeInTheDocument();
  });

  it('should display the library when the user clicks on the library link', async () => {
    const user = userEvent.setup();
    const client = createQueryClientWithUserAndOrg();
    const initialEntries = [`${APP_DASHBOARD_BASENAME}/${org.username}`];
    renderApp({ client, initialEntries });
    await user.click(screen.getByRole('link', { name: textMock('dashboard.library') }));
    expect(getLibraryHeading()).toBeInTheDocument();
  });

  it('should display the apps overview when the user is on the library page and clicks on the apps link', async () => {
    const user = userEvent.setup();
    const client = createQueryClientWithUserAndOrg();
    const initialEntries = [`${APP_DASHBOARD_BASENAME}/${org.username}`];
    renderApp({ client, initialEntries });
    await user.click(screen.getByRole('link', { name: textMock('dashboard.library') }));
    await user.click(screen.getByRole('link', { name: textMock('dashboard.apps') }));
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
  screen.getByRole('heading', { name: textMock('app_content_library.library_heading') });

function createQueryClientWithUserAndOrg(): QueryClient {
  const client = createQueryClientMock();
  client.setQueryData([QueryKey.CurrentUser], userMock);
  client.setQueryData([QueryKey.Organizations], [org]);
  return client;
}

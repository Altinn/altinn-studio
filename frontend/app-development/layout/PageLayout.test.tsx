import React from 'react';
import { PageLayout } from './PageLayout';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { repoStatus } from 'app-shared/mocks/mocks';
import { HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { useWebSocket } from 'app-development/hooks/useWebSocket';
import { syncEntityUpdateWebSocketHub, syncEventsWebSocketHub } from 'app-shared/api/paths';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

jest.mock('app-development/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

describe('PageLayout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initially displays the spinner when loading data', () => {
    render();

    expect(screen.getByTitle(textMock('repo_status.loading'))).toBeInTheDocument();
  });

  it('renders "StudioNotFoundPage" when repoStatus has error', async () => {
    render({
      getRepoStatus: () => Promise.reject(createApiErrorMock(ServerCodes.NotFound)),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('repo_status.loading')));

    expect(
      screen.getByRole('heading', { name: textMock('not_found_page.heading'), level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders "MergeConflictWarning" when repoStatus has merge conflict', async () => {
    render({
      getRepoStatus: () => Promise.resolve({ ...repoStatus, hasMergeConflict: true }),
    });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('repo_status.loading')));

    expect(
      screen.getByRole('heading', { name: textMock('merge_conflict.headline'), level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders the page content and no errors when there are no errors', async () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });
    await resolveAndWaitForSpinnerToDisappear();

    expect(
      screen.queryByRole('heading', { name: textMock('not_found_page.heading'), level: 1 }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('heading', { name: textMock('merge_conflict.headline'), level: 1 }),
    ).not.toBeInTheDocument();
  });

  it('renders header with no publish button when repoOwner is a private person', async () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });
    await resolveAndWaitForSpinnerToDisappear();

    expect(screen.getByRole('link', { name: textMock('top_menu.preview') })).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: textMock(HeaderMenuItemKey.Deploy) }),
    ).not.toBeInTheDocument();
  });

  it('should setup the webSocket with the correct parameters', async () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });
    await resolveAndWaitForSpinnerToDisappear();

    expect(useWebSocket).toHaveBeenCalledWith({
      clientsName: ['FileSyncSuccess', 'FileSyncError', 'EntityUpdated'],
      webSocketUrls: [syncEntityUpdateWebSocketHub(), syncEventsWebSocketHub()],
      webSocketConnector: WSConnector,
    });
  });
});

const resolveAndWaitForSpinnerToDisappear = async (queries: Partial<ServicesContextProps> = {}) => {
  render(queries);
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('repo_status.loading')));
};

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  renderWithProviders(<PageLayout />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app/${RoutePaths.Overview}`,
    queries,
  });
};

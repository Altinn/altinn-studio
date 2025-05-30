import React from 'react';
import { VersionAlert } from './VersionAlert';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import {
  APP_DEVELOPMENT_BASENAME,
  LATEST_BACKEND_VERSION,
  LATEST_FRONTEND_VERSION,
} from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import { RoutePaths } from 'app-development/enums/RoutePaths';

const defaultTitle = 'title';
const defaultText = 'text';

describe('VersionAlert', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and text', async () => {
    render();

    expect(screen.getByRole('heading', { name: defaultTitle, level: 2 })).toBeInTheDocument();
    expect(screen.getByText(defaultText)).toBeInTheDocument();
  });

  it('renders frontend info when frontend is outdated', async () => {
    render({
      getAppVersion: () => Promise.resolve({ frontendVersion: '3', backendVersion: '8' }),
    });

    expect(await screen.findByText(`v${LATEST_FRONTEND_VERSION}`)).toBeInTheDocument();
    expect(
      await screen.findByText(
        textMock('versions.migrate_frontend_version', { latestVersion: LATEST_FRONTEND_VERSION }),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole(`v${LATEST_BACKEND_VERSION}`)).not.toBeInTheDocument();
    expect(
      screen.queryByRole(textMock('versions.migrate_backend_version')),
    ).not.toBeInTheDocument();
  });

  it('renders backend info when backend is outdated', async () => {
    render({
      getAppVersion: () => Promise.resolve({ frontendVersion: '4', backendVersion: '7' }),
    });

    expect(screen.queryByRole(`v${LATEST_FRONTEND_VERSION}`)).not.toBeInTheDocument();
    expect(
      screen.queryByRole(textMock('versions.migrate_frontend_version')),
    ).not.toBeInTheDocument();
    expect(await screen.findByText(`v${LATEST_BACKEND_VERSION}`)).toBeInTheDocument();
    expect(
      await screen.findByText(
        textMock('versions.migrate_backend_version', { latestVersion: LATEST_BACKEND_VERSION }),
      ),
    ).toBeInTheDocument();
  });

  it('renders dialog if both frontend and backend are outdated', async () => {
    render({
      getAppVersion: () => Promise.resolve({ frontendVersion: '3', backendVersion: '7' }),
    });

    expect(await screen.findByText(`v${LATEST_FRONTEND_VERSION}`)).toBeInTheDocument();
    expect(
      await screen.findByText(
        textMock('versions.migrate_frontend_version', { latestVersion: LATEST_FRONTEND_VERSION }),
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText(`v${LATEST_BACKEND_VERSION}`)).toBeInTheDocument();
    expect(
      await screen.findByText(
        textMock('versions.migrate_backend_version', { latestVersion: LATEST_BACKEND_VERSION }),
      ),
    ).toBeInTheDocument();
  });
});

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  renderWithProviders(<VersionAlert title={defaultTitle}>{defaultText}</VersionAlert>, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.UIEditor}`,
    queries,
  });
};

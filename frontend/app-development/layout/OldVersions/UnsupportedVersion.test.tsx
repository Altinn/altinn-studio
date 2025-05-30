import React from 'react';
import { UnsupportedVersion } from './UnsupportedVersion';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import { RoutePaths } from 'app-development/enums/RoutePaths';

describe('UnsupportedVersion', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog if frontend is unsupported', async () => {
    render({
      getAppVersion: () => Promise.resolve({ frontendVersion: '2', backendVersion: '8' }),
    });

    expect(
      await screen.findByRole('heading', {
        name: textMock('versions.unsupported_version'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText(textMock('versions.supported_old_version'))).toBeInTheDocument();
  });

  it('renders dialog if backend is unsupported', async () => {
    render({
      getAppVersion: () => Promise.resolve({ frontendVersion: '4', backendVersion: '6' }),
    });

    expect(
      await screen.findByRole('heading', {
        name: textMock('versions.unsupported_version'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText(textMock('versions.supported_old_version'))).toBeInTheDocument();
  });

  it('renders dialog if both frontend and backend are unsupported', async () => {
    render({
      getAppVersion: () => Promise.resolve({ frontendVersion: '2', backendVersion: '6' }),
    });

    expect(
      await screen.findByRole('heading', {
        name: textMock('versions.unsupported_version'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText(textMock('versions.supported_old_version'))).toBeInTheDocument();
  });

  it('does not render dialog if no unsupported version', async () => {
    render({
      getAppVersion: () => Promise.resolve({ frontendVersion: '4', backendVersion: '8' }),
    });

    expect(
      screen.queryByRole('heading', { name: textMock('versions.unsupported_version') }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole(textMock('versions.supported_old_version'))).not.toBeInTheDocument();
  });
});

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  renderWithProviders(<UnsupportedVersion />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.UIEditor}`,
    queries,
  });
};

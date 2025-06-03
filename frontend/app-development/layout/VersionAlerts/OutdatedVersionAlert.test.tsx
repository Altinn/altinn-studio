import React from 'react';
import { OutdatedVersionAlert } from './OutdatedVersionAlert';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import userEvent from '@testing-library/user-event';

describe('OutdatedVersionAlert', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog if frontend is outdated', async () => {
    render({
      getAppVersion: () => Promise.resolve({ frontendVersion: '3', backendVersion: '8' }),
    });

    expect(
      await screen.findByRole('heading', {
        name: textMock('version_alerts.outdated_version_title'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(textMock('version_alerts.outdated_version_title_content')),
    ).toBeInTheDocument();
  });

  it('renders dialog if backend is outdated', async () => {
    render({
      getAppVersion: () => Promise.resolve({ frontendVersion: '4', backendVersion: '7' }),
    });

    expect(
      await screen.findByRole('heading', {
        name: textMock('version_alerts.outdated_version_title'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(textMock('version_alerts.outdated_version_title_content')),
    ).toBeInTheDocument();
  });

  it('renders dialog if both frontend and backend are outdated', async () => {
    render({
      getAppVersion: () => Promise.resolve({ frontendVersion: '3', backendVersion: '7' }),
    });

    expect(
      await screen.findByRole('heading', {
        name: textMock('version_alerts.outdated_version_title'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(textMock('version_alerts.outdated_version_title_content')),
    ).toBeInTheDocument();
  });

  it('does not render dialog if no outdated version', async () => {
    render({
      getAppVersion: () => Promise.resolve({ frontendVersion: '4', backendVersion: '8' }),
    });

    expect(
      screen.queryByRole('heading', { name: textMock('version_alerts.outdated_version_title') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole(textMock('version_alerts.outdated_version_title_content')),
    ).not.toBeInTheDocument();
  });

  describe('OutdatedVersionRemindChoiceDialog', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should close popover and not set value in local storage when the "do show again" button is clicked', async () => {
      render({
        getAppVersion: () => Promise.resolve({ frontendVersion: '3', backendVersion: '7' }),
      });

      const user = userEvent.setup();

      // Open popover
      const closeButton = await screen.findByRole('button', { name: textMock('general.close') });
      await user.click(closeButton);

      const popover = screen.getByText(textMock('session.reminder'));
      expect(popover).toBeInTheDocument();
      const hidePopoverTemporaryButton = screen.getByRole('button', {
        name: textMock('session.do_show_again'),
      });

      // Click hide temporary button
      await user.click(hidePopoverTemporaryButton);

      expect(window.localStorage.getItem('hideOutdatedVersionDialog')).toBeNull();
    });

    it('should close popover and set value in local storage when the "do not show again" is clicked', async () => {
      render({
        getAppVersion: () => Promise.resolve({ frontendVersion: '3', backendVersion: '7' }),
      });

      const user = userEvent.setup();

      // Open popover
      const closeButton = await screen.findByRole('button', { name: textMock('general.close') });
      await user.click(closeButton);

      const popover = screen.getByText(textMock('session.reminder'));
      expect(popover).toBeInTheDocument();
      const hidePopoverForSessionButton = screen.getByRole('button', {
        name: textMock('session.dont_show_again'),
      });

      // Click hide forever button
      await user.click(hidePopoverForSessionButton);

      expect(window.localStorage.getItem('hideOutdatedVersionDialog')).toBe('false');
    });
  });
});

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  renderWithProviders(<OutdatedVersionAlert />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.UIEditor}`,
    queries,
  });
};

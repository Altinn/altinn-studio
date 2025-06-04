import React from 'react';
import { VersionDialog } from './VersionDialog';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import {
  APP_DEVELOPMENT_BASENAME,
  MAXIMUM_SUPPORTED_BACKEND_VERSION,
  MAXIMUM_SUPPORTED_FRONTEND_VERSION,
} from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import userEvent from '@testing-library/user-event';

describe('VersionDialog', () => {
  describe('Dialog', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    // it('renders title and text', async () => {
    //   render();

    //   expect(screen.getByRole('heading', { name: defaultTitle, level: 2 })).toBeInTheDocument();
    //   expect(screen.getByText(defaultText)).toBeInTheDocument();
    // });

    it('renders frontend info when frontend is outdated', async () => {
      render({
        getAppVersion: () => Promise.resolve({ frontendVersion: '3', backendVersion: '8' }),
      });

      expect(await screen.findByText(`v${MAXIMUM_SUPPORTED_FRONTEND_VERSION}`)).toBeInTheDocument();
      expect(
        await screen.findByText(
          textMock('version_alerts.update_frontend', {
            latestVersion: MAXIMUM_SUPPORTED_FRONTEND_VERSION,
          }),
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole(`v${MAXIMUM_SUPPORTED_BACKEND_VERSION}`)).not.toBeInTheDocument();
      expect(screen.queryByRole(textMock('version_alerts.update_backend'))).not.toBeInTheDocument();
    });

    it('renders backend info when backend is outdated', async () => {
      render({
        getAppVersion: () => Promise.resolve({ frontendVersion: '4', backendVersion: '7' }),
      });

      expect(screen.queryByRole(`v${MAXIMUM_SUPPORTED_FRONTEND_VERSION}`)).not.toBeInTheDocument();
      expect(
        screen.queryByRole(textMock('version_alerts.update_frontend')),
      ).not.toBeInTheDocument();
      expect(await screen.findByText(`v${MAXIMUM_SUPPORTED_BACKEND_VERSION}`)).toBeInTheDocument();
      expect(
        await screen.findByText(
          textMock('version_alerts.update_backend', {
            latestVersion: MAXIMUM_SUPPORTED_BACKEND_VERSION,
          }),
        ),
      ).toBeInTheDocument();
    });

    it('renders dialog if both frontend and backend are outdated', async () => {
      render({
        getAppVersion: () => Promise.resolve({ frontendVersion: '3', backendVersion: '7' }),
      });

      expect(await screen.findByText(`v${MAXIMUM_SUPPORTED_FRONTEND_VERSION}`)).toBeInTheDocument();
      expect(
        await screen.findByText(
          textMock('version_alerts.update_frontend', {
            latestVersion: MAXIMUM_SUPPORTED_FRONTEND_VERSION,
          }),
        ),
      ).toBeInTheDocument();
      expect(await screen.findByText(`v${MAXIMUM_SUPPORTED_BACKEND_VERSION}`)).toBeInTheDocument();
      expect(
        await screen.findByText(
          textMock('version_alerts.update_backend', {
            latestVersion: MAXIMUM_SUPPORTED_BACKEND_VERSION,
          }),
        ),
      ).toBeInTheDocument();
    });
  });

  describe('UnsupportedVersionDialog', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('renders dialog', async () => {
      render();
      expect(
        await screen.findByRole('heading', {
          name: textMock('version_alerts.unsupported_version_title'),
          level: 2,
        }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(textMock('version_alerts.unsupported_version_content')),
      ).toBeInTheDocument();
    });
  });

  describe('OutdatedVersionDialog', () => {
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

        expect(window.localStorage.getItem(`studio:hideVersionDialog:${org}:${app}`)).toBeNull();
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

        expect(window.localStorage.getItem(`studio:hideVersionDialog:${org}:${app}`)).toBe('true');
      });
    });
  });
});

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  renderWithProviders(<VersionDialog />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.UIEditor}`,
    queries,
  });
};

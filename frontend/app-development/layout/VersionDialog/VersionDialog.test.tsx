import React from 'react';
import { VersionDialog } from './VersionDialog';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  APP_DEVELOPMENT_BASENAME,
  MAXIMUM_SUPPORTED_BACKEND_VERSION,
  MAXIMUM_SUPPORTED_FRONTEND_VERSION,
} from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

describe('VersionDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  describe('Dialog', () => {
    it('renders frontend info when frontend is outdated', () => {
      render({
        frontendVersion: '3',
        backendVersion: '8',
      });

      expect(screen.getByText(`v${MAXIMUM_SUPPORTED_FRONTEND_VERSION}`)).toBeInTheDocument();
      expect(
        screen.getByText(
          textMock('version_dialog.update_frontend', {
            latestVersion: MAXIMUM_SUPPORTED_FRONTEND_VERSION,
          }),
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(`v${MAXIMUM_SUPPORTED_BACKEND_VERSION}`)).not.toBeInTheDocument();
      expect(screen.queryByText(textMock('version_dialog.update_backend'))).not.toBeInTheDocument();
    });

    it('renders backend info when backend is outdated', () => {
      render({
        frontendVersion: '4',
        backendVersion: '7',
      });

      expect(screen.queryByText(`v${MAXIMUM_SUPPORTED_FRONTEND_VERSION}`)).not.toBeInTheDocument();
      expect(
        screen.queryByText(textMock('version_dialog.update_frontend')),
      ).not.toBeInTheDocument();
      expect(screen.getByText(`v${MAXIMUM_SUPPORTED_BACKEND_VERSION}`)).toBeInTheDocument();
      expect(
        screen.getByText(
          textMock('version_dialog.update_backend', {
            latestVersion: MAXIMUM_SUPPORTED_BACKEND_VERSION,
          }),
        ),
      ).toBeInTheDocument();
    });

    it('renders dialog if both frontend and backend are outdated', () => {
      render({
        frontendVersion: '3',
        backendVersion: '7',
      });

      expect(screen.getByText(`v${MAXIMUM_SUPPORTED_FRONTEND_VERSION}`)).toBeInTheDocument();
      expect(
        screen.getByText(
          textMock('version_dialog.update_frontend', {
            latestVersion: MAXIMUM_SUPPORTED_FRONTEND_VERSION,
          }),
        ),
      ).toBeInTheDocument();
      expect(screen.getByText(`v${MAXIMUM_SUPPORTED_BACKEND_VERSION}`)).toBeInTheDocument();
      expect(
        screen.getByText(
          textMock('version_dialog.update_backend', {
            latestVersion: MAXIMUM_SUPPORTED_BACKEND_VERSION,
          }),
        ),
      ).toBeInTheDocument();
    });
  });

  describe('UnsupportedVersionDialog', () => {
    it('renders dialog', () => {
      render({
        frontendVersion: '2',
        backendVersion: '6',
      });
      expect(
        screen.getByRole('heading', {
          name: textMock('version_dialog.unsupported_version_title'),
          level: 2,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(textMock('version_dialog.unsupported_version_content')),
      ).toBeInTheDocument();
    });
  });

  describe('OutdatedVersionDialog', () => {
    it('renders dialog if frontend is outdated', () => {
      render({
        frontendVersion: '3',
        backendVersion: '8',
      });

      expect(
        screen.getByRole('heading', {
          name: textMock('version_dialog.outdated_version_title'),
          level: 2,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(textMock('version_dialog.outdated_version_title_content')),
      ).toBeInTheDocument();
    });

    it('renders dialog if backend is outdated', () => {
      render({
        frontendVersion: '4',
        backendVersion: '7',
      });

      expect(
        screen.getByRole('heading', {
          name: textMock('version_dialog.outdated_version_title'),
          level: 2,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(textMock('version_dialog.outdated_version_title_content')),
      ).toBeInTheDocument();
    });

    it('renders dialog if both frontend and backend are outdated', () => {
      render({
        frontendVersion: '3',
        backendVersion: '7',
      });

      expect(
        screen.getByRole('heading', {
          name: textMock('version_dialog.outdated_version_title'),
          level: 2,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(textMock('version_dialog.outdated_version_title_content')),
      ).toBeInTheDocument();
    });

    it('does not render dialog if no outdated version', () => {
      render({
        frontendVersion: '4',
        backendVersion: '8',
      });

      expect(
        screen.queryByRole('heading', { name: textMock('version_dialog.outdated_version_title') }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(textMock('version_dialog.outdated_version_title_content')),
      ).not.toBeInTheDocument();
    });

    describe('RemindChoiceDialog', () => {
      it('should close popover and not set value in local storage when the "do show again" button is clicked', async () => {
        render({
          frontendVersion: '3',
          backendVersion: '7',
        });

        const user = userEvent.setup();

        // Open popover
        const closeButton = screen.getByRole('button', { name: textMock('general.close') });
        await user.click(closeButton);

        const popover = screen.getByText(textMock('session.reminder'));
        expect(popover).toBeInTheDocument();
        const hidePopoverTemporaryButton = screen.getByRole('button', {
          name: textMock('session.do_show_again'),
        });

        // Click hide temporary button
        await user.click(hidePopoverTemporaryButton);

        expect(
          window.localStorage.getItem(`studio:skippedUpdateVersions:${org}:${app}`),
        ).toBeNull();
      });

      it('should close popover and set value in local storage when the "do not show again" is clicked', async () => {
        render({
          frontendVersion: '3',
          backendVersion: '7',
        });

        const user = userEvent.setup();

        // Open popover
        const closeButton = screen.getByRole('button', { name: textMock('general.close') });
        await user.click(closeButton);

        const popover = screen.getByText(textMock('session.reminder'));
        expect(popover).toBeInTheDocument();
        const hidePopoverForSessionButton = screen.getByRole('button', {
          name: textMock('session.dont_show_again'),
        });

        // Click hide forever button
        await user.click(hidePopoverForSessionButton);

        expect(window.localStorage.getItem(`studio:skippedUpdateVersions:${org}:${app}`)).toBe(
          '{"frontendVersion":"3","backendVersion":"7"}',
        );
      });
    });
  });
});

const render = ({
  frontendVersion,
  backendVersion,
}: {
  frontendVersion?: string;
  backendVersion?: string;
} = {}) => {
  const queryClientMock = createQueryClientMock();
  queryClientMock.setQueryData([QueryKey.AppVersion, org, app], {
    frontendVersion,
    backendVersion,
  });

  renderWithProviders(<VersionDialog />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/${RoutePaths.UIEditor}`,
    queryClient: queryClientMock,
  });
};

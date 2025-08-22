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
    const outdatedVersions = [
      {
        frontendVersion: '3',
        backendVersion: '8',
        testTitle: 'renders frontend info when frontend is outdated',
      },
      {
        frontendVersion: '4',
        backendVersion: '7',
        testTitle: 'renders backend info when backend is outdated',
      },
      {
        frontendVersion: '3',
        backendVersion: '7',
        testTitle: 'renders both frontend and backend info when both are outdated',
      },
    ];

    it.each(outdatedVersions)('$testTitle', ({ frontendVersion, backendVersion }) => {
      renderVersionDialog({
        frontendVersion,
        backendVersion,
      });

      AssertVersionDialogVisibleProps({
        frontendVersion,
        backendVersion,
      });
    });
  });

  describe('UnsupportedVersionDialog', () => {
    it('renders dialog', () => {
      renderVersionDialog({
        frontendVersion: '2',
        backendVersion: '6',
      });

      const unsupportedVersionTitle = screen.getByRole('heading', {
        name: textMock('version_dialog.unsupported_version_title'),
        level: 2,
      });
      const unsupportedVersionContent = screen.getByText(
        textMock('version_dialog.unsupported_version_content'),
      );

      expect(unsupportedVersionTitle).toBeInTheDocument();
      expect(unsupportedVersionContent).toBeInTheDocument();
    });
  });

  describe('OutdatedVersionDialog', () => {
    const outdatedVersions = [
      {
        frontendVersion: '3',
        backendVersion: '8',
        testTitle: 'renders dialog if frontend is outdated',
      },
      {
        frontendVersion: '4',
        backendVersion: '7',
        testTitle: 'renders dialog if backend is outdated',
      },
      {
        frontendVersion: '3',
        backendVersion: '7',
        testTitle: 'renders dialog if both frontend and backend are outdated',
      },
      {
        frontendVersion: '4',
        backendVersion: '8',
        testTitle: 'does not render dialog if no outdated version',
      },
    ];

    it.each(outdatedVersions)('$testTitle', ({ frontendVersion, backendVersion }) => {
      renderVersionDialog({
        frontendVersion,
        backendVersion,
      });

      if (
        parseInt(frontendVersion) < MAXIMUM_SUPPORTED_FRONTEND_VERSION ||
        parseInt(backendVersion) < MAXIMUM_SUPPORTED_BACKEND_VERSION
      ) {
        assertOutdatedDialogVisible(true);
      } else {
        assertOutdatedDialogVisible(false);
      }
    });

    describe('RemindChoiceDialog', () => {
      it('should close popover and not set value in local storage when the "do show again" button is clicked', async () => {
        renderVersionDialog({
          frontendVersion: '3',
          backendVersion: '7',
        });

        const user = userEvent.setup();

        await openPopover();

        const hidePopoverTemporaryButton = screen.getByRole('button', {
          name: textMock('session.do_show_again'),
        });
        await user.click(hidePopoverTemporaryButton);

        expect(
          window.localStorage.getItem(`studio:skippedUpdateVersions:${org}:${app}`),
        ).toBeNull();
      });

      it('should close popover and set value in local storage when the "do not show again" is clicked', async () => {
        renderVersionDialog({
          frontendVersion: '3',
          backendVersion: '7',
        });

        const user = userEvent.setup();

        await openPopover();
        const hidePopoverForSessionButton = screen.getByRole('button', {
          name: textMock('session.dont_show_again'),
        });

        await user.click(hidePopoverForSessionButton);
        expect(window.localStorage.getItem(`studio:skippedUpdateVersions:${org}:${app}`)).toBe(
          '{"frontendVersion":"3","backendVersion":"7"}',
        );
      });
    });
  });
});

const openPopover = async () => {
  const user = userEvent.setup();

  const closeButton = screen.getByRole('button', { name: textMock('general.close') });
  await user.click(closeButton);

  const popover = screen.getByText(textMock('session.reminder'));
  expect(popover).toBeInTheDocument();
};

const assertOutdatedDialogVisible = (shouldBeVisible: boolean) => {
  const title = screen.queryByRole('heading', {
    name: textMock('version_dialog.outdated_version_title'),
    level: 2,
  });
  const description = screen.queryByText(textMock('version_dialog.outdated_version_description'));
  const recommendation = screen.queryByText(
    textMock('version_dialog.outdated_version_recommendation'),
  );

  if (shouldBeVisible) {
    expect(title).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(recommendation).toBeInTheDocument();
  } else {
    expect(title).not.toBeInTheDocument();
    expect(description).not.toBeInTheDocument();
    expect(recommendation).not.toBeInTheDocument();
  }
};

type AssertVersionDialogVisibleProps = {
  frontendVersion: string;
  backendVersion: string;
};

const AssertVersionDialogVisibleProps = ({
  frontendVersion,
  backendVersion,
}: AssertVersionDialogVisibleProps) => {
  const latestFrontend = screen.queryByText(`v${MAXIMUM_SUPPORTED_FRONTEND_VERSION}`);
  const latestBackend = screen.queryByText(`v${MAXIMUM_SUPPORTED_BACKEND_VERSION}`);

  const frontendLinkText = screen.queryByText(
    textMock('version_dialog.update_frontend', {
      latestVersion: MAXIMUM_SUPPORTED_FRONTEND_VERSION,
    }),
  );

  const backendLinkText = screen.queryByText(
    textMock('version_dialog.update_backend', {
      latestVersion: MAXIMUM_SUPPORTED_BACKEND_VERSION,
    }),
  );

  const isFrontendOutdated = parseInt(frontendVersion) < MAXIMUM_SUPPORTED_FRONTEND_VERSION;
  const isBackendOutdated = parseInt(backendVersion) < MAXIMUM_SUPPORTED_BACKEND_VERSION;

  if (isFrontendOutdated) {
    expect(latestFrontend).toBeInTheDocument();
    expect(frontendLinkText).toBeInTheDocument();
  } else {
    expect(latestFrontend).not.toBeInTheDocument();
    expect(frontendLinkText).not.toBeInTheDocument();
  }

  if (isBackendOutdated) {
    expect(latestBackend).toBeInTheDocument();
    expect(backendLinkText).toBeInTheDocument();
  } else {
    expect(latestBackend).not.toBeInTheDocument();
    expect(backendLinkText).not.toBeInTheDocument();
  }
};

const renderVersionDialog = ({
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

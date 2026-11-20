import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { DEPLOY_EVENT_NAME, DeployPopover, type DeployPopoverProps } from './DeployPopover';
import { textMock } from '@designer/testing/mocks/i18nMock';
import '@testing-library/jest-dom';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from 'app-development/test/mocks';
import { type AppRelease } from 'app-shared/types/AppRelease';
import { appRelease } from 'app-shared/mocks/mocks';
import { BuildResult } from 'app-shared/types/Build';
import type { DeployWarning, DeployWarnings } from 'app-shared/types/api/DeployWarnings';
import { app, org } from '@studio/testing/testids';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import userEvent from '@testing-library/user-event';

const created = '01.01.2024 18:53';
const appReleases: AppRelease[] = [
  {
    ...appRelease,
    tagName: 'test1',
    created,
    build: {
      ...appRelease.build,
      result: BuildResult.succeeded,
    },
  },
  {
    ...appRelease,
    tagName: 'test2',
    created,
    build: {
      ...appRelease.build,
      result: BuildResult.succeeded,
    },
  },
];

const captureMock = vi.fn();
vi.mock('@posthog/react', () => ({
  usePostHog: () => ({ capture: captureMock }),
}));

const defaultProps: DeployPopoverProps = {
  appDeployedVersion: '1.0.0',
  selectedImageTag: '1.1.0',
  envName: 'production',
  disabled: false,
  isPending: false,
  onConfirm: vi.fn(),
};

const warningTextKeys: Record<DeployWarning, string> = {
  upgradeToV9: 'app_deployment.deploy_warning.upgrade_to_v9',
  rollbackFromV9: 'app_deployment.deploy_warning.rollback_from_v9',
  prereleaseToProduction: 'app_deployment.deploy_warning.prerelease_to_production',
};

describe('DeployPopover', () => {
  it('should render the deploy button with the correct text', () => {
    renderDeployPopover();
    expect(
      screen.getByRole('button', { name: textMock('app_deployment.btn_deploy_new_version') }),
    ).toBeInTheDocument();
  });

  it('should disable the button if no selected image tag is provided', () => {
    renderDeployPopover({ componentProps: { selectedImageTag: '' } });

    expect(
      screen.getByRole('button', { name: textMock('app_deployment.btn_deploy_new_version') }),
    ).toBeDisabled();
  });

  it('should show a spinner if deployment is pending', () => {
    renderDeployPopover({ componentProps: { isPending: true } });

    expect(screen.getByText(textMock('app_deployment.deploy_loading'))).toBeInTheDocument();
  });

  it('should display the deploy confirmation message with app version when the popover is open', async () => {
    renderDeployPopover();
    await openConfirmation();

    expect(
      screen.getByText(
        textMock('app_deployment.deploy_confirmation', {
          selectedImageTag: '1.1.0',
          appDeployedVersion: '1.0.0',
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should display the short confirmation message if no app version is provided', async () => {
    renderDeployPopover({ componentProps: { appDeployedVersion: '' } });
    await openConfirmation();

    expect(
      screen.getByText(
        textMock('app_deployment.deploy_confirmation_short', { selectedImageTag: '1.1.0' }),
      ),
    ).toBeInTheDocument();
  });

  it('should call onConfirm and close the popover when "Yes" button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirmMock = vi.fn();
    renderDeployPopover({ componentProps: { onConfirm: onConfirmMock } });

    await openConfirmation();
    await user.click(screen.getByRole('button', { name: textMock('general.yes') }));

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(textMock('general.yes'))).not.toBeInTheDocument();
  });

  it('should capture a PostHog event when "Yes" button is clicked', async () => {
    const user = userEvent.setup();
    renderDeployPopover();

    await openConfirmation();
    await user.click(screen.getByRole('button', { name: textMock('general.yes') }));

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith(DEPLOY_EVENT_NAME);
  });

  it('should close the popover when "Cancel" button is clicked', async () => {
    const user = userEvent.setup();
    renderDeployPopover();

    await openConfirmation();
    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));

    expect(screen.queryByText(textMock('general.cancel'))).not.toBeInTheDocument();
  });

  describe('version warnings', () => {
    it('should check the selected release against the environment', async () => {
      const getDeployWarnings = vi.fn().mockResolvedValue(noWarnings('8.7.2', '8.6.0'));
      renderDeployPopover({ queries: { getDeployWarnings } });

      await openConfirmation();

      expect(getDeployWarnings).toHaveBeenCalledWith(org, app, '1.1.0', 'production');
    });

    it('should show the confirmation as before when both versions are on the same major', async () => {
      renderDeployPopover({ warnings: noWarnings('8.7.2', '8.6.0') });

      await openConfirmation();

      expectNoWarnings();
      expect(
        screen.getByText(
          textMock('app_deployment.deploy_confirmation', {
            selectedImageTag: '1.1.0',
            appDeployedVersion: '1.0.0',
          }),
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: textMock('general.yes') })).toBeEnabled();
    });

    it('should show the confirmation as before when a version is unknown', async () => {
      renderDeployPopover({ warnings: noWarnings(null, null) });

      await openConfirmation();

      expectNoWarnings();
    });

    it('should warn that a v9 release takes over the instances of a running v8 app', async () => {
      renderDeployPopover({
        warnings: {
          warnings: ['upgradeToV9'],
          releaseAppLibVersion: '9.0.0',
          environmentAppLibVersion: '8.7.2',
        },
      });

      await openConfirmation();

      expect(screen.getByText(warningText('upgradeToV9', '9.0.0', '8.7.2'))).toBeInTheDocument();
      expect(screen.queryByText(warningText('rollbackFromV9', '9.0.0', '8.7.2'))).toBeNull();
    });

    it('should warn that a v8 release over a running v9 app is a rollback', async () => {
      renderDeployPopover({
        warnings: {
          warnings: ['rollbackFromV9'],
          releaseAppLibVersion: '8.7.2',
          environmentAppLibVersion: '9.0.0',
        },
      });

      await openConfirmation();

      expect(screen.getByText(warningText('rollbackFromV9', '8.7.2', '9.0.0'))).toBeInTheDocument();
    });

    it('should warn about a prerelease to production', async () => {
      renderDeployPopover({
        warnings: {
          warnings: ['prereleaseToProduction'],
          releaseAppLibVersion: '9.0.0-preview.10',
          environmentAppLibVersion: null,
        },
      });

      await openConfirmation();

      expect(
        screen.getByText(warningText('prereleaseToProduction', '9.0.0-preview.10', null)),
      ).toBeInTheDocument();
    });

    it('should show every warning that applies, and still let the user deploy', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      renderDeployPopover({
        componentProps: { onConfirm },
        warnings: {
          warnings: ['upgradeToV9', 'prereleaseToProduction'],
          releaseAppLibVersion: '9.0.0-preview.10',
          environmentAppLibVersion: '8.7.2',
        },
      });

      await openConfirmation();
      expect(
        screen.getByText(warningText('upgradeToV9', '9.0.0-preview.10', '8.7.2')),
      ).toBeInTheDocument();
      expect(
        screen.getByText(warningText('prereleaseToProduction', '9.0.0-preview.10', '8.7.2')),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: textMock('general.yes') }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should leave out a warning it has no text for', async () => {
      renderDeployPopover({
        warnings: {
          warnings: ['someLaterWarning' as DeployWarning],
          releaseAppLibVersion: '10.0.0',
          environmentAppLibVersion: '9.0.0',
        },
      });

      await openConfirmation();

      expectNoWarnings();
      expect(screen.getByRole('button', { name: textMock('general.yes') })).toBeEnabled();
    });

    it('should wait for the check before the user can confirm', async () => {
      const user = userEvent.setup();
      renderDeployPopover({
        queries: { getDeployWarnings: vi.fn().mockReturnValue(new Promise(() => {})) },
      });

      await user.click(
        screen.getByRole('button', { name: textMock('app_deployment.btn_deploy_new_version') }),
      );

      expect(
        screen.getByText(textMock('app_deployment.deploy_warnings_loading')),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: textMock('general.yes') })).toBeDisabled();
    });

    it('should show the confirmation as before when the check fails', async () => {
      renderDeployPopover({
        queries: {
          getDeployWarnings: vi
            .fn()
            .mockRejectedValue(createApiErrorMock(ServerCodes.InternalServerError)),
        },
      });

      await openConfirmation();

      expectNoWarnings();
      expect(screen.queryByText(textMock('app_deployment.deploy_warnings_loading'))).toBeNull();
    });
  });
});

const noWarnings = (
  releaseAppLibVersion: string | null,
  environmentAppLibVersion: string | null,
): DeployWarnings => ({ warnings: [], releaseAppLibVersion, environmentAppLibVersion });

const warningText = (
  warning: DeployWarning,
  releaseVersion: string,
  environmentVersion: string | null,
): string => textMock(warningTextKeys[warning], { releaseVersion, environmentVersion });

const expectNoWarnings = (): void => {
  Object.values(warningTextKeys).forEach((textKey) =>
    expect(screen.queryByText(textKey, { exact: false })).toBeNull(),
  );
};

// Opens the confirmation and waits for the version check, which the confirm button waits for too.
const openConfirmation = async (): Promise<void> => {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: textMock('app_deployment.btn_deploy_new_version') }),
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: textMock('general.yes') })).toBeEnabled(),
  );
};

type Props = {
  componentProps?: Partial<DeployPopoverProps>;
  queries?: Partial<ServicesContextProps>;
  warnings?: DeployWarnings;
};

const renderDeployPopover = (props: Partial<Props> = {}) => {
  const { componentProps, queries, warnings = noWarnings(null, null) } = props;

  return renderWithProviders({
    getAppReleases: vi.fn().mockImplementation(() =>
      Promise.resolve({
        results: appReleases,
      }),
    ),
    getDeployWarnings: vi.fn().mockResolvedValue(warnings),
    ...queries,
  })(<DeployPopover {...defaultProps} {...componentProps} />);
};

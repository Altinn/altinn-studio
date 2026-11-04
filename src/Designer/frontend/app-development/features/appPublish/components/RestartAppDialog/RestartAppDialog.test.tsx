import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import type { RunningApp } from 'app-shared/types/api/RunningApp';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from '../../../../test/testUtils';
import type { RestartAppDialogProps } from './RestartAppDialog';
import { RestartAppDialog } from './RestartAppDialog';

const runningApp: RunningApp = {
  environment: 'tt02',
  version: '1',
  buildId: null,
  status: 'ready',
  restartedAt: null,
  canRestart: true,
};

const defaultProps: RestartAppDialogProps = {
  runningApp,
  envTitle: 'TT02',
  isOpen: true,
  onClose: vi.fn(),
};

describe('RestartAppDialog', () => {
  it('is named by its title, so screen readers announce what it restarts', () => {
    renderRestartAppDialog();

    expect(
      screen.getByRole('dialog', {
        name: textMock('app_deployment.restart_confirmation_dialog_title', { envTitle: 'TT02' }),
      }),
    ).toBeInTheDocument();
  });

  it('keeps its own color, rather than that of the status alert it sits in', () => {
    renderRestartAppDialog();

    expect(screen.getByRole('dialog')).toHaveAttribute('data-color', 'accent');
  });

  it('leaves the version out when it is unknown', () => {
    renderRestartAppDialog({ runningApp: { ...runningApp, version: null } });

    expect(
      screen.getByText(
        textMock('app_deployment.restart_confirmation_dialog_description_without_version'),
      ),
    ).toBeInTheDocument();
  });

  it('does not let the user confirm while the app is updating', () => {
    renderRestartAppDialog({ runningApp: { ...runningApp, status: 'updating' } });

    expect(
      screen.getByRole('button', { name: textMock('app_deployment.restart_confirmation_button') }),
    ).toBeDisabled();
  });

  it('restarts the app in the environment once the user confirms', async () => {
    const user = userEvent.setup();
    const restartApp = vi.fn().mockResolvedValue({ ...runningApp, status: 'updating' });
    const onClose = vi.fn();
    renderRestartAppDialog({ onClose }, { restartApp });

    await user.click(
      screen.getByRole('button', { name: textMock('app_deployment.restart_confirmation_button') }),
    );

    expect(restartApp).toHaveBeenCalledTimes(1);
    expect(restartApp).toHaveBeenCalledWith(org, app, 'tt02');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes without restarting the app when the user cancels', async () => {
    const user = userEvent.setup();
    const restartApp = vi.fn();
    const onClose = vi.fn();
    renderRestartAppDialog({ onClose }, { restartApp });

    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));

    expect(restartApp).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

function renderRestartAppDialog(
  props: Partial<RestartAppDialogProps> = {},
  queries: Partial<ServicesContextProps> = {},
): void {
  renderWithProviders(<RestartAppDialog {...defaultProps} {...props} />, {
    queries,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/deploy`,
  });
}

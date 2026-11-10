import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { renderWithProviders } from '../../../../test/testUtils';
import type { UndeployDialogProps } from './UndeployDialog';
import { UndeployDialog } from './UndeployDialog';

const defaultProps: UndeployDialogProps = {
  environment: 'tt02',
  envTitle: 'TT02',
  isOpen: true,
  onClose: vi.fn(),
};

describe('UndeployDialog', () => {
  it('is named by its title, so screen readers announce what it unpublishes', () => {
    renderUndeployDialog();

    expect(
      screen.getByRole('dialog', {
        name: textMock('app_deployment.undeploy_dialog_title', { envTitle: 'TT02' }),
      }),
    ).toBeInTheDocument();
  });

  it('keeps its own color, rather than that of the status alert it sits in', () => {
    renderUndeployDialog();

    expect(screen.getByRole('dialog')).toHaveAttribute('data-color', 'accent');
  });

  it('shows nothing when it is closed', () => {
    renderUndeployDialog({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('warns about what the user must consider before unpublishing', () => {
    renderUndeployDialog();

    expect(
      screen.getByRole('heading', {
        name: textMock('app_deployment.unpublish_considerations_title'),
      }),
    ).toBeInTheDocument();
  });

  it('does not let the user unpublish before typing the name of the app', () => {
    renderUndeployDialog();

    expect(getUndeployButton()).toBeDisabled();
  });

  it('does not let the user unpublish when the typed name only contains the name of the app', async () => {
    const user = userEvent.setup();
    renderUndeployDialog();

    await user.type(getAppNameField(), `${app}-old`);

    expect(getUndeployButton()).toBeDisabled();
  });

  it('unpublishes the app from the environment and closes once the user confirms', async () => {
    const user = userEvent.setup();
    const undeployAppFromEnv = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderUndeployDialog({ onClose }, { undeployAppFromEnv });

    await user.type(getAppNameField(), app.toUpperCase());
    await user.click(getUndeployButton());

    expect(undeployAppFromEnv).toHaveBeenCalledTimes(1);
    expect(undeployAppFromEnv).toHaveBeenCalledWith(org, app, 'tt02');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('unpublishes the app when the user presses Enter in the name field', async () => {
    const user = userEvent.setup();
    const undeployAppFromEnv = vi.fn().mockResolvedValue(undefined);
    renderUndeployDialog({}, { undeployAppFromEnv });

    await user.type(getAppNameField(), `${app}{Enter}`);

    expect(undeployAppFromEnv).toHaveBeenCalledWith(org, app, 'tt02');
  });

  it('stays open and shows an error when the app could not be unpublished', async () => {
    const user = userEvent.setup();
    const undeployAppFromEnv = vi.fn().mockRejectedValue(createApiErrorMock());
    const onClose = vi.fn();
    renderUndeployDialog({ onClose }, { undeployAppFromEnv });

    await user.type(getAppNameField(), app);
    await user.click(getUndeployButton());

    expect(screen.getByText(textMock('app_deployment.error_unknown.message'))).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not let the user unpublish twice while the request is pending', async () => {
    const user = userEvent.setup();
    const undeployAppFromEnv = vi.fn(() => new Promise<void>(() => {}));
    renderUndeployDialog({}, { undeployAppFromEnv });

    await user.type(getAppNameField(), app);
    await user.click(getUndeployButton());
    await user.click(getUndeployButton());

    expect(undeployAppFromEnv).toHaveBeenCalledTimes(1);
  });

  it('closes without unpublishing when the user cancels', async () => {
    const user = userEvent.setup();
    const undeployAppFromEnv = vi.fn();
    const onClose = vi.fn();
    renderUndeployDialog({ onClose }, { undeployAppFromEnv });

    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));

    expect(undeployAppFromEnv).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks for the name of the app again when it is opened again', async () => {
    const user = userEvent.setup();
    const { rerender } = renderUndeployDialog();
    await user.type(getAppNameField(), app);

    rerender(<UndeployDialog {...defaultProps} isOpen={false} />);
    rerender(<UndeployDialog {...defaultProps} isOpen />);

    expect(getAppNameField()).toHaveValue('');
  });
});

function renderUndeployDialog(
  props: Partial<UndeployDialogProps> = {},
  queries: Partial<ServicesContextProps> = {},
) {
  return renderWithProviders(<UndeployDialog {...defaultProps} {...props} />, {
    queries,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/deploy`,
  });
}

const getAppNameField = () =>
  screen.getByLabelText(textMock('app_deployment.undeploy_confirmation_input_label'));

const getUndeployButton = () =>
  screen.getByRole('button', { name: textMock('app_deployment.undeploy_button') });

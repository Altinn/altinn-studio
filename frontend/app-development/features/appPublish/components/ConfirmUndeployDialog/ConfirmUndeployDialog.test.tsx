import { renderWithProviders } from '../../../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import React from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmUndeployDialog } from './ConfirmUndeployDialog';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

describe('ConfirmUndeployDialog', () => {
  it('should provide a input field to confirm the app to undeploy and button is disabled', async () => {
    renderConfirmUndeployDialog({
      undeployAppFromEnvMock: jest.fn(),
    });
    await openDialog();

    const confirmTextField = getConfirmTextField();
    const undeployButton = getUndeployButton();

    expect(confirmTextField).toBeInTheDocument();
    expect(undeployButton).toBeDisabled();
  });

  it('should enable undeploy button when confirm text field matches the app name', async () => {
    const user = userEvent.setup();
    renderConfirmUndeployDialog({
      undeployAppFromEnvMock: jest.fn(),
    });
    await openDialog();

    const confirmTextField = getConfirmTextField();
    await user.type(confirmTextField, app);
    expect(confirmTextField).toHaveValue(app);

    const undeployButton = getUndeployButton();
    expect(undeployButton).toBeEnabled();
  });

  it('should not be case-sensitive when confirming the app-name', async () => {
    const user = userEvent.setup();
    renderConfirmUndeployDialog({
      undeployAppFromEnvMock: jest.fn(),
    });
    await openDialog();

    const appNameInUpperCase = app.toUpperCase();

    const confirmTextField = getConfirmTextField();
    await user.type(confirmTextField, appNameInUpperCase);
    expect(confirmTextField).toHaveValue(appNameInUpperCase);

    const undeployButton = getUndeployButton();
    expect(undeployButton).toBeEnabled();
  });

  it('should trigger undeploy when undeploy button is clicked', async () => {
    const user = userEvent.setup();
    const undeployMock = jest.fn();
    renderConfirmUndeployDialog({
      undeployAppFromEnvMock: undeployMock,
    });
    await openDialog();
    const confirmTextField = getConfirmTextField();
    await user.type(confirmTextField, app);
    await user.click(getUndeployButton());

    expect(undeployMock).toBeCalledTimes(1);
    expect(undeployMock).toHaveBeenCalledWith('testOrg', 'testApp', 'unit-test-env');
  });

  it('should display an error alert when the undeploy mutation fails', async () => {
    const user = userEvent.setup();
    const undeployMock = jest.fn(() => Promise.reject(createApiErrorMock()));
    renderConfirmUndeployDialog({
      undeployAppFromEnvMock: undeployMock,
    });

    await openDialog();

    const errorMessageKey = 'app_deployment.error_unknown.message';
    const confirmTextField = getConfirmTextField();
    await user.type(confirmTextField, app);

    const undeployButton = getUndeployButton();
    await user.click(undeployButton);

    expect(undeployMock).toBeCalledTimes(1);
    expect(undeployMock).toHaveBeenCalledWith('testOrg', 'testApp', 'unit-test-env');

    const alertMessage = screen.getByText(textMock(errorMessageKey));
    expect(alertMessage).toBeInTheDocument();
  });

  it('should disable the undeploy-button while undeploy isPending', async () => {
    const user = userEvent.setup();
    const undeployMock = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));

    renderConfirmUndeployDialog({
      undeployAppFromEnvMock: undeployMock,
    });
    await openDialog();

    const confirmTextField = getConfirmTextField();
    await user.type(confirmTextField, app);

    const undeployButton = getUndeployButton();
    await user.click(undeployButton);

    expect(undeployButton).toBeDisabled();
  });
});

async function openDialog(): Promise<void> {
  const user = userEvent.setup();
  const button = screen.getByRole('button', { name: textMock('app_deployment.undeploy_button') });
  await user.click(button);
}

function getConfirmTextField(): HTMLInputElement | null {
  return screen.getByLabelText(textMock('app_deployment.undeploy_confirmation_input_label'));
}

function getUndeployButton(): HTMLButtonElement | null {
  return screen.getByRole('button', {
    name: textMock('app_deployment.undeploy_confirmation_button'),
  });
}

type RenderConfirmUndeployDialog = {
  environment?: string;
  undeployAppFromEnvMock: jest.Mock;
};

function renderConfirmUndeployDialog({
  undeployAppFromEnvMock,
  environment = 'unit-test-env',
}: RenderConfirmUndeployDialog): void {
  renderWithProviders(<ConfirmUndeployDialog environment={environment} />, {
    queries: {
      undeployAppFromEnv: undeployAppFromEnvMock,
    },
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/deploy`,
  });
}

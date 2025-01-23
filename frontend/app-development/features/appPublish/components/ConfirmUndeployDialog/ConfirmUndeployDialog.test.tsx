import { renderWithProviders } from '../../../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';
import React from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmUndeployDialog } from './ConfirmUndeployDialog';
import { useUndeployMutation } from '../../../../hooks/mutations/useUndeployMutation';

jest.mock('../../../../hooks/mutations/useUndeployMutation');

describe('ConfirmUndeployDialog', () => {
  it('should provide a input field to confirm the app to undeploy and button is disabled', async () => {
    renderConfirmUndeployDialog();
    await openDialog();

    const confirmTextField = getConfirmTextField();
    const undeployButton = getUndeployButton();

    expect(confirmTextField).toBeInTheDocument();
    expect(undeployButton).toBeDisabled();
  });

  it('should enable undeploy button when confirm text field matches the app name', async () => {
    const user = userEvent.setup();
    renderConfirmUndeployDialog();
    await openDialog();

    const confirmTextField = getConfirmTextField();
    await user.type(confirmTextField, app);
    expect(confirmTextField).toHaveValue(app);

    const undeployButton = getUndeployButton();
    expect(undeployButton).toBeEnabled();
  });

  it('should not be case-sensitive when confirming the app-name', async () => {
    const user = userEvent.setup();
    renderConfirmUndeployDialog();
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
    renderConfirmUndeployDialog();
    await openDialog();

    const mutateFunctionMock = jest.fn();
    (useUndeployMutation as jest.Mock).mockReturnValue({
      mutate: mutateFunctionMock,
    });

    const confirmTextField = getConfirmTextField();
    await user.type(confirmTextField, app);
    await user.click(getUndeployButton());

    expect(mutateFunctionMock).toBeCalledTimes(1);
    expect(mutateFunctionMock).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'unit-test-env' }),
      expect.anything(),
    );
  });

  it('should display an error alert when the undeploy mutation fails', async () => {
    const user = userEvent.setup();
    renderConfirmUndeployDialog();
    await openDialog();

    const errorMessageKey = 'app_deployment.error_unknown.message';
    const mutateFunctionMock = jest.fn((_, { onError }) => onError());

    (useUndeployMutation as jest.Mock).mockReturnValue({
      mutate: mutateFunctionMock,
    });

    const confirmTextField = getConfirmTextField();
    await user.type(confirmTextField, app);

    const undeployButton = getUndeployButton();
    await user.click(undeployButton);

    expect(mutateFunctionMock).toBeCalledTimes(1);
    expect(mutateFunctionMock).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'unit-test-env' }),
      expect.anything(),
    );

    const alertMessage = screen.getByText(textMock(errorMessageKey));
    expect(alertMessage).toBeInTheDocument();
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

function renderConfirmUndeployDialog(environment: string = 'unit-test-env'): void {
  renderWithProviders(<ConfirmUndeployDialog environment={environment} />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/deploy`,
  });
}

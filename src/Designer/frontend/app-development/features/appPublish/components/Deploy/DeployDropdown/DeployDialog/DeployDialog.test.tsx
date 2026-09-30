import { screen } from '@testing-library/react';
import { DEPLOY_EVENT_NAME, DeployDialog, type DeployDialogProps } from './DeployDialog';
import { textMock } from '@studio/testing/mocks/i18nMock';
import '@testing-library/jest-dom';
import { renderWithProviders } from 'app-development/test/mocks';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

const captureMock = jest.fn();
jest.mock('@posthog/react', () => ({
  usePostHog: () => ({ capture: captureMock }),
}));

const defaultProps: DeployDialogProps = {
  appDeployedVersion: '1.0.0',
  selectedImageTag: '1.1.0',
  disabled: false,
  isPending: false,
  defaultAppStatus: 'UnderDevelopment',
  onConfirm: jest.fn(),
};

describe('DeployDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the deploy button with the correct text', () => {
    renderDeployDialog();
    expect(getDeployButton()).toBeInTheDocument();
  });

  it('should disable the button if no selected image tag is provided', () => {
    renderDeployDialog({ selectedImageTag: '' });
    expect(getDeployButton()).toBeDisabled();
  });

  it('should disable the button when disabled is true', () => {
    renderDeployDialog({ disabled: true });
    expect(getDeployButton()).toBeDisabled();
  });

  it('should show a spinner if deployment is pending', () => {
    renderDeployDialog({ isPending: true });
    expect(screen.getByText(textMock('app_deployment.deploy_loading'))).toBeInTheDocument();
  });

  it('should display the deploy confirmation message with app version when the dialog is open', async () => {
    const user = userEvent.setup();
    renderDeployDialog();

    await openDialog(user);

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
    const user = userEvent.setup();
    renderDeployDialog({ appDeployedVersion: '' });

    await openDialog(user);

    expect(
      screen.getByText(
        textMock('app_deployment.deploy_confirmation_short', { selectedImageTag: '1.1.0' }),
      ),
    ).toBeInTheDocument();
  });

  it('should preselect "Under development" when it is the default app status', async () => {
    const user = userEvent.setup();
    renderDeployDialog({ defaultAppStatus: 'UnderDevelopment' });

    await openDialog(user);

    expect(getUnderDevelopmentRadio()).toBeChecked();
    expect(getCompletedRadio()).not.toBeChecked();
  });

  it('should preselect "Completed" when it is the default app status', async () => {
    const user = userEvent.setup();
    renderDeployDialog({ defaultAppStatus: 'Completed' });

    await openDialog(user);

    expect(getCompletedRadio()).toBeChecked();
    expect(getUnderDevelopmentRadio()).not.toBeChecked();
  });

  it('should call onConfirm with the default app status when confirming without changes', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    renderDeployDialog({ onConfirm, defaultAppStatus: 'Completed' });

    await openDialog(user);
    await user.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('Completed');
  });

  it('should call onConfirm with the selected app status', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    renderDeployDialog({ onConfirm, defaultAppStatus: 'UnderDevelopment' });

    await openDialog(user);
    await user.click(getCompletedRadio());
    await user.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledWith('Completed');
  });

  it('should reset the app status to the default when the dialog is reopened', async () => {
    const user = userEvent.setup();
    renderDeployDialog({ defaultAppStatus: 'UnderDevelopment' });

    await openDialog(user);
    await user.click(getCompletedRadio());
    await user.click(getCancelButton());
    await openDialog(user);

    expect(getUnderDevelopmentRadio()).toBeChecked();
  });

  it('should capture a PostHog event when the deployment is confirmed', async () => {
    const user = userEvent.setup();
    renderDeployDialog();

    await openDialog(user);
    await user.click(getConfirmButton());

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith(DEPLOY_EVENT_NAME);
  });

  it('should close the dialog without deploying when "Cancel" is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    renderDeployDialog({ onConfirm });

    await openDialog(user);
    await user.click(getCancelButton());

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

const openDialog = async (user: UserEvent): Promise<void> => {
  await user.click(getDeployButton());
};

const getDeployButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: textMock('app_deployment.btn_deploy_new_version') });

const getConfirmButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: textMock('app_deployment.deploy_dialog_confirm') });

const getCancelButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: textMock('general.cancel') });

const getUnderDevelopmentRadio = (): HTMLInputElement =>
  screen.getByRole('radio', { name: textMock('app_deployment.app_status_under_development') });

const getCompletedRadio = (): HTMLInputElement =>
  screen.getByRole('radio', { name: textMock('app_deployment.app_status_completed') });

const renderDeployDialog = (props: Partial<DeployDialogProps> = {}) =>
  renderWithProviders()(<DeployDialog {...defaultProps} {...props} />);

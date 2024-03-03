import React from 'react';
import { render as rtlRender, act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeployDropdownProps } from './DeployDropdown';
import { DeployDropdown } from './DeployDropdown';
import { textMock } from '../../../../testing/mocks/i18nMock';

const defaultProps: DeployDropdownProps = {
  appDeployedVersion: '',
  imageOptions: [
    {
      label: 'test 1',
      value: 'test1',
    },
    {
      label: 'test 2',
      value: 'test2',
    },
  ],
  disabled: false,
  setSelectedImageTag: jest.fn(),
  selectedImageTag: 'test1',
  startDeploy: jest.fn(),
  isPending: false,
};

describe('DeployDropdown', () => {
  describe('Dropdown', () => {
    afterEach(jest.clearAllMocks);

    it('renders image options', async () => {
      const user = userEvent.setup();

      await render();

      const select = screen.getByLabelText(textMock('app_deployment.choose_version'));
      await act(() => user.click(select));

      expect(
        screen.getByRole('option', { name: defaultProps.imageOptions[0].label }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: defaultProps.imageOptions[1].label }),
      ).toBeInTheDocument();
    });

    it('does not render when image options are empty', async () => {
      render({ imageOptions: [] });
      expect(screen.queryByText(textMock('app_deployment.choose_version'))).not.toBeInTheDocument();
    });

    it('selects default image option', async () => {
      await render({ selectedImageTag: defaultProps.imageOptions[0].value });

      expect(screen.getByRole('combobox')).toHaveValue(defaultProps.imageOptions[0].label);
    });

    it('selects new image option', async () => {
      const user = userEvent.setup();

      await render();

      const select = screen.getByLabelText(textMock('app_deployment.choose_version'));
      await act(() => user.click(select));

      const option = screen.getByRole('option', { name: defaultProps.imageOptions[1].label });
      await act(() => user.click(option));

      await waitFor(() => {
        expect(defaultProps.setSelectedImageTag).toHaveBeenCalledWith(
          defaultProps.imageOptions[1].value,
        );
      });
    });

    it('shows a loding spinner when mutation is pending', () => {
      render({ isPending: true });

      const deployButton = screen.getByRole('button', {
        name: textMock('app_deployment.btn_deploy_new_version'),
      });
      expect(within(deployButton).getByTestId('spinner-test-id')).toBeInTheDocument();
    });

    it('disables both dropdown and button when deploy is not possible', () => {
      render({ disabled: true });

      expect(screen.getByLabelText(textMock('app_deployment.choose_version'))).toBeDisabled();

      const deployButton = screen.getByRole('button', {
        name: textMock('app_deployment.btn_deploy_new_version'),
      });
      expect(deployButton).toBeDisabled();
    });
  });

  describe('Confirmation dialog', () => {
    afterEach(jest.clearAllMocks);

    it('should open the confirmation dialog when clicking the deploy button', async () => {
      const user = userEvent.setup();

      await render();

      const deployButton = screen.getByRole('button', {
        name: textMock('app_deployment.btn_deploy_new_version'),
      });
      await act(() => user.click(deployButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(
        textMock('app_deployment.deploy_confirmation_short', {
          selectedImageTag: defaultProps.imageOptions[0].value,
        }),
      );
      expect(text).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: textMock('general.yes') });
      expect(confirmButton).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should open the confirmation dialog with a warning message when clicking the deploy button to an environment that alreadys has a deployed application', async () => {
      const user = userEvent.setup();

      await render({
        appDeployedVersion: '1',
      });

      const deployButton = screen.getByRole('button', {
        name: textMock('app_deployment.btn_deploy_new_version'),
      });
      await act(() => user.click(deployButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(
        textMock('app_deployment.deploy_confirmation', {
          selectedImageTag: defaultProps.imageOptions[0].value,
          appDeployedVersion: '1',
        }),
      );
      expect(text).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: textMock('general.yes') });
      expect(confirmButton).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should confirm and close the dialog when clicking the confirm button', async () => {
      const user = userEvent.setup();

      await render();

      const deployButton = screen.getByRole('button', {
        name: textMock('app_deployment.btn_deploy_new_version'),
      });
      await act(() => user.click(deployButton));

      const confirmButton = screen.getByRole('button', { name: textMock('general.yes') });
      await act(() => user.click(confirmButton));

      expect(defaultProps.startDeploy).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close the confirmation dialog when clicking the cancel button', async () => {
      const user = userEvent.setup();

      await render();

      const deployButton = screen.getByRole('button', {
        name: textMock('app_deployment.btn_deploy_new_version'),
      });
      await act(() => user.click(deployButton));

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      await act(() => user.click(cancelButton));

      expect(defaultProps.startDeploy).toHaveBeenCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close when clicking outside the popover', async () => {
      const user = userEvent.setup();

      await render();

      const deployButton = screen.getByRole('button', {
        name: textMock('app_deployment.btn_deploy_new_version'),
      });
      await act(() => user.click(deployButton));

      await act(() => user.click(document.body));

      expect(defaultProps.startDeploy).toHaveBeenCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});

const render = async (props: Partial<DeployDropdownProps> = {}) =>
  rtlRender(<DeployDropdown {...defaultProps} {...props} />);

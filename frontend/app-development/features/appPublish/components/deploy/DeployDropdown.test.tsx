import React from 'react';
import { render as rtlRender, act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeployDropdownProps } from './DeployDropdown';
import { DeployDropdown } from './DeployDropdown';
import { textMock } from '../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

const startDeployMock = jest.fn();

describe('DeployDropdown', () => {
  describe('Delete confirmation dialog', () => {
    afterEach(jest.clearAllMocks);

    it('should open the confirmation dialog when clicking the delete button', async () => {
      await render();

      const deleteButton = screen.getByRole('button', {
        name: textMock('app_deploy_messages.btn_deploy_new_version'),
      });
      await act(() => user.click(deleteButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(
        textMock('app_deploy_messages.deploy_confirmation_short', { selectedImageTag: '' })
      );
      expect(text).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: textMock('general.yes') });
      expect(confirmButton).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should confirm and close the dialog when clicking the confirm button', async () => {
      await render();

      const deleteButton = screen.getByRole('button', {
        name: textMock('app_deploy_messages.btn_deploy_new_version'),
      });
      await act(() => user.click(deleteButton));

      const confirmButton = screen.getByRole('button', { name: textMock('general.yes') });
      await act(() => user.click(confirmButton));

      expect(startDeployMock).toBeCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close the confirmation dialog when clicking the cancel button', async () => {
      await render();

      const deleteButton = screen.getByRole('button', {
        name: textMock('app_deploy_messages.btn_deploy_new_version'),
      });
      await act(() => user.click(deleteButton));

      const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
      await act(() => user.click(cancelButton));

      expect(startDeployMock).toBeCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close when clicking outside the popover', async () => {
      await render();

      const deleteButton = screen.getByRole('button', {
        name: textMock('app_deploy_messages.btn_deploy_new_version'),
      });
      await act(() => user.click(deleteButton));

      await act(() => user.click(document.body));

      expect(startDeployMock).toBeCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});

const render = async (props: Partial<DeployDropdownProps> = {}) => {
  const allProps: DeployDropdownProps = {
    appDeployedVersion: '',
    envName: '',
    imageOptions: [],
    disabled: false,
    deployHistoryEntry: {},
    deploymentStatus: '',
    setSelectedImageTag: jest.fn(),
    selectedImageTag: '',
    startDeploy: startDeployMock,
    ...props,
  };

  return rtlRender(<DeployDropdown {...allProps} />);
};

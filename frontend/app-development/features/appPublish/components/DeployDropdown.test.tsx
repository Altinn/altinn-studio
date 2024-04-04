import React from 'react';
import { act, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeployDropdownProps } from './DeployDropdown';
import { DeployDropdown } from './DeployDropdown';
import { textMock } from '../../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from 'app-development/test/mocks';
import type { AppRelease } from 'app-shared/types/AppRelease';
import { BuildResult } from 'app-shared/types/Build';
import { appRelease } from 'app-shared/mocks/mocks';

const defaultProps: DeployDropdownProps = {
  appDeployedVersion: '',
  disabled: false,
  setSelectedImageTag: jest.fn(),
  selectedImageTag: 'test1',
  startDeploy: jest.fn(),
  isPending: false,
};

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

const imageOptions = [
  {
    label: textMock('app_deployment.version_label', {
      tagName: appReleases[0].tagName,
      createdDateTime: created,
    }),
    value: appReleases[0].tagName,
  },
  {
    label: textMock('app_deployment.version_label', {
      tagName: appReleases[1].tagName,
      createdDateTime: created,
    }),
    value: appReleases[1].tagName,
  },
];

describe('DeployDropdown', () => {
  describe('Dropdown', () => {
    afterEach(jest.clearAllMocks);

    it('renders a spinner while loading data', () => {
      render();

      expect(screen.getByTitle(textMock('app_deployment.releases_loading'))).toBeInTheDocument();
    });

    it('renders an error message if an error occurs while loading data', async () => {
      render(
        {},
        {
          getAppReleases: jest.fn().mockImplementation(() => Promise.reject()),
        },
      );
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

      expect(screen.getByText(textMock('app_deployment.releases_error'))).toBeInTheDocument();
    });

    it('render no image options message when image options are empty', async () => {
      const user = userEvent.setup();

      render(
        {},
        {
          getAppReleases: jest.fn().mockImplementation(() =>
            Promise.resolve({
              results: [],
            }),
          ),
        },
      );
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

      const select = screen.getByLabelText(textMock('app_deployment.choose_version'));
      await act(() => user.click(select));

      expect(screen.getByText(textMock('app_deployment.no_versions'))).toBeInTheDocument();
    });

    it('renders image options', async () => {
      const user = userEvent.setup();

      render();
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

      const select = screen.getByLabelText(textMock('app_deployment.choose_version'));
      await act(() => user.click(select));

      expect(screen.getByRole('option', { name: imageOptions[0].label })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: imageOptions[1].label })).toBeInTheDocument();
    });

    it('selects default image option', async () => {
      render({ selectedImageTag: imageOptions[0].value });
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

      expect(screen.getByRole('combobox')).toHaveValue(imageOptions[0].label);
    });

    it('selects new image option', async () => {
      const user = userEvent.setup();

      render();
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

      const select = screen.getByLabelText(textMock('app_deployment.choose_version'));
      await act(() => user.click(select));

      const option = screen.getByRole('option', { name: imageOptions[1].label });
      await act(() => user.click(option));

      await waitFor(() => {
        expect(defaultProps.setSelectedImageTag).toHaveBeenCalledWith(imageOptions[1].value);
      });
    });

    it('shows a loding spinner when mutation is pending', async () => {
      render({ isPending: true });
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

      const deployButton = screen.getByRole('button', {
        name: textMock('app_deployment.btn_deploy_new_version'),
      });
      expect(within(deployButton).getByTestId('spinner-test-id')).toBeInTheDocument();
    });

    it('disables both dropdown and button when deploy is not possible', async () => {
      render({ disabled: true });
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

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

      render();
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

      const deployButton = screen.getByRole('button', {
        name: textMock('app_deployment.btn_deploy_new_version'),
      });
      await act(() => user.click(deployButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(
        textMock('app_deployment.deploy_confirmation_short', {
          selectedImageTag: imageOptions[0].value,
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

      render({
        appDeployedVersion: '1',
      });
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

      const deployButton = screen.getByRole('button', {
        name: textMock('app_deployment.btn_deploy_new_version'),
      });
      await act(() => user.click(deployButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(
        textMock('app_deployment.deploy_confirmation', {
          selectedImageTag: imageOptions[0].value,
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

      render();
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

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

      render();
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

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

      render();
      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('app_deployment.releases_loading')),
      );

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

const render = (props?: Partial<DeployDropdownProps>, queries?: Partial<ServicesContextProps>) => {
  return renderWithMockStore(
    {},
    {
      getAppReleases: jest.fn().mockImplementation(() =>
        Promise.resolve({
          results: appReleases,
        }),
      ),
      ...queries,
    },
  )(<DeployDropdown {...defaultProps} {...props} />);
};

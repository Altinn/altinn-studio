import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeployDropdownProps } from './DeployDropdown';
import { DeployDropdown } from './DeployDropdown';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from 'app-development/test/mocks';
import type { AppRelease } from 'app-shared/types/AppRelease';
import { BuildResult } from 'app-shared/types/Build';
import { appRelease } from 'app-shared/mocks/mocks';
import { type ImageOption } from '../../ImageOption';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

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

const imageOptions: ImageOption[] = [
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
  afterEach(jest.clearAllMocks);

  it('renders a spinner while loading data', () => {
    renderDeployDropdown();

    expect(screen.getByText(textMock('app_deployment.releases_loading'))).toBeInTheDocument();
  });

  it('renders an error message if an error occurs while loading data', async () => {
    renderDeployDropdown(
      {},
      {
        getAppReleases: jest.fn().mockImplementation(() => Promise.reject(createApiErrorMock())),
      },
    );
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_deployment.releases_loading')),
    );

    expect(screen.getByText(textMock('app_deployment.releases_error'))).toBeInTheDocument();
  });

  it('render no image options message when image options are empty', async () => {
    const user = userEvent.setup();

    renderDeployDropdown(
      {},
      {
        getAppReleases: jest.fn().mockImplementation(() =>
          Promise.resolve({
            results: [],
          }),
        ),
      },
    );
    await waitForSpinnerToBeRemoved();

    const select = await screen.findByLabelText(textMock('app_deployment.choose_version'));
    await user.click(select);

    expect(screen.getByText(textMock('app_deployment.no_versions'))).toBeInTheDocument();
  });

  it('renders image options', async () => {
    const user = userEvent.setup();

    renderDeployDropdown();
    await waitForSpinnerToBeRemoved();

    const select = screen.getByLabelText(textMock('app_deployment.choose_version'));
    await user.click(select);

    expect(screen.getByRole('option', { name: imageOptions[0].label })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: imageOptions[1].label })).toBeInTheDocument();
  });

  it('selects default image option', async () => {
    renderDeployDropdown({ selectedImageTag: imageOptions[0].value });
    await waitForSpinnerToBeRemoved();

    expect(screen.getByRole('combobox')).toHaveValue(imageOptions[0].label);
  });

  it('selects new image option', async () => {
    const user = userEvent.setup();

    renderDeployDropdown();
    await waitForSpinnerToBeRemoved();

    const select = screen.getByLabelText(textMock('app_deployment.choose_version'));
    await user.click(select);

    const option = screen.getByRole('option', { name: imageOptions[1].label });
    await user.click(option);

    await waitFor(() => {
      expect(defaultProps.setSelectedImageTag).toHaveBeenCalledWith(imageOptions[1].value);
    });
  });

  it('shows a loding spinner when mutation is pending', async () => {
    renderDeployDropdown({ isPending: true });
    await waitForSpinnerToBeRemoved();

    expect(screen.getByText(textMock('app_deployment.deploy_loading'))).toBeInTheDocument();
  });

  it('disables both dropdown and button when deploy is not possible', async () => {
    renderDeployDropdown({ disabled: true });
    await waitForSpinnerToBeRemoved();

    expect(screen.getByLabelText(textMock('app_deployment.choose_version'))).toBeDisabled();

    const deployButton = screen.getByRole('button', {
      name: textMock('app_deployment.btn_deploy_new_version'),
    });
    expect(deployButton).toBeDisabled();
  });

  it('should confirm and close the dialog when clicking the confirm button', async () => {
    const user = userEvent.setup();

    renderDeployDropdown();
    await waitForSpinnerToBeRemoved();

    const deployButton = screen.getByRole('button', {
      name: textMock('app_deployment.btn_deploy_new_version'),
    });
    await user.click(deployButton);

    const confirmButton = screen.getByRole('button', { name: textMock('general.yes') });
    await user.click(confirmButton);

    expect(defaultProps.startDeploy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

const waitForSpinnerToBeRemoved = async () => {
  await waitForElementToBeRemoved(() =>
    screen.queryByText(textMock('app_deployment.releases_loading')),
  );
};

const renderDeployDropdown = (
  props?: Partial<DeployDropdownProps>,
  queries?: Partial<ServicesContextProps>,
) => {
  return renderWithProviders({
    getAppReleases: jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: appReleases,
      }),
    ),
    ...queries,
  })(<DeployDropdown {...defaultProps} {...props} />);
};

import React from 'react';
import { screen } from '@testing-library/react';
import { DeployPopover, type DeployPopoverProps } from './DeployPopover';
import { textMock } from '@studio/testing/mocks/i18nMock';
import '@testing-library/jest-dom';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from '../../../../../../test/mocks';
import { type AppRelease } from 'app-shared/types/AppRelease';
import { appRelease } from 'app-shared/mocks/mocks';
import { BuildResult } from 'app-shared/types/Build';
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

const defaultProps: DeployPopoverProps = {
  appDeployedVersion: '1.0.0',
  selectedImageTag: '1.1.0',
  disabled: false,
  isPending: false,
  onConfirm: jest.fn(),
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

    expect(screen.getByTitle(textMock('app_deployment.deploy_loading'))).toBeInTheDocument();
  });

  it('should display the deploy confirmation message with app version when the popover is open', async () => {
    const user = userEvent.setup();
    renderDeployPopover();

    const button = screen.getByRole('button', {
      name: textMock('app_deployment.btn_deploy_new_version'),
    });
    await user.click(button);

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
    renderDeployPopover({ componentProps: { appDeployedVersion: '' } });

    const button = screen.getByRole('button', {
      name: textMock('app_deployment.btn_deploy_new_version'),
    });
    await user.click(button);

    expect(
      screen.getByText(
        textMock('app_deployment.deploy_confirmation_short', { selectedImageTag: '1.1.0' }),
      ),
    ).toBeInTheDocument();
  });

  it('should call onConfirm and close the popover when "Yes" button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirmMock = jest.fn();
    renderDeployPopover({ componentProps: { onConfirm: onConfirmMock } });

    const button = screen.getByRole('button', {
      name: textMock('app_deployment.btn_deploy_new_version'),
    });
    await user.click(button);
    await user.click(screen.getByRole('button', { name: textMock('general.yes') }));

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(textMock('general.yes'))).not.toBeInTheDocument();
  });

  it('should close the popover when "Cancel" button is clicked', async () => {
    const user = userEvent.setup();
    renderDeployPopover();

    const button = screen.getByRole('button', {
      name: textMock('app_deployment.btn_deploy_new_version'),
    });
    await user.click(button);
    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));

    expect(screen.queryByText(textMock('general.cancel'))).not.toBeInTheDocument();
  });
});

type Props = {
  componentProps?: Partial<DeployPopoverProps>;
  queries?: Partial<ServicesContextProps>;
};

const renderDeployPopover = (props: Partial<Props> = {}) => {
  const { componentProps, queries } = props;

  return renderWithProviders({
    getAppReleases: jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: appReleases,
      }),
    ),
    ...queries,
  })(<DeployPopover {...defaultProps} {...componentProps} />);
};

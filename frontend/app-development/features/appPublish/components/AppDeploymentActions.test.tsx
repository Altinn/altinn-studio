import React from 'react';
import type { AppDeploymentActionsProps } from './AppDeploymentActions';
import { AppDeploymentActions } from './AppDeploymentActions';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithMockStore } from 'app-development/test/mocks';
import { textMock } from '../../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const defaultProps: AppDeploymentActionsProps = {
  appDeployedVersion: 'test',
  lastBuildId: '',
  inProgress: false,
  deployPermission: true,
  envName: 'test',
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
  orgName: 'test',
};

const render = (
  props?: Partial<AppDeploymentActionsProps>,
  queries?: Partial<ServicesContextProps>,
) => {
  return renderWithMockStore({}, queries)(<AppDeploymentActions {...defaultProps} {...props} />);
};
describe('AppDeploymentActions', () => {
  it('should render missing rights message if deployPermission is false', () => {
    render({ deployPermission: false });
    expect(
      screen.getByText(
        textMock('app_deployment.missing_rights', {
          envName: defaultProps.envName,
          orgName: defaultProps.orgName,
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should not render when image options are empty', async () => {
    render({ imageOptions: [] });
    expect(screen.queryByText(textMock('app_deployment.choose_version'))).not.toBeInTheDocument();
  });

  it('should render deploy dropdown with image options', async () => {
    const user = userEvent.setup();

    render();

    const select = screen.getByLabelText(textMock('app_deployment.choose_version'));
    await act(() => user.click(select));

    expect(
      screen.getByRole('option', { name: defaultProps.imageOptions[0].label }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: defaultProps.imageOptions[1].label }),
    ).toBeInTheDocument();
  });

  it('should be disabled when deployment is in progress', () => {
    render({ inProgress: true });

    expect(screen.getByLabelText(textMock('app_deployment.choose_version'))).toBeDisabled();
  });

  it('should render error message if call to deployment endpoint fails', async () => {
    const user = userEvent.setup();

    const queries: Partial<ServicesContextProps> = {
      createDeployment: jest.fn().mockRejectedValue(new Error('test error')),
    };
    render({}, queries);

    const select = screen.getByLabelText(textMock('app_deployment.choose_version'));
    await act(() => user.click(select));

    const option = screen.getByRole('option', { name: defaultProps.imageOptions[1].label });
    await act(() => user.click(option));

    const deployButton = await screen.findByRole('button', {
      name: textMock('app_deployment.btn_deploy_new_version'),
    });
    await act(() => user.click(deployButton));

    const confirmButton = screen.getByRole('button', { name: textMock('general.yes') });
    await act(() => user.click(confirmButton));

    expect(
      await screen.findByText(textMock('app_deployment.technical_error_1')),
    ).toBeInTheDocument();
  });
});

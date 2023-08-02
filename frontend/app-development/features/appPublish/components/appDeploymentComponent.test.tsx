import React from 'react';
import {
  AppDeploymentComponent,
  AppDeploymentComponentProps,
  ImageOption,
} from './appDeploymentComponent';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithMockStore } from 'app-development/test/mocks';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { IDeployment } from 'app-development/sharedResources/appDeployment/types';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const render = (
  props?: Partial<AppDeploymentComponentProps>,
  queries?: Partial<ServicesContextProps>
) => {
  const defaultProps: AppDeploymentComponentProps = {
    deployHistory: [],
    deployPermission: true,
    envName: 'test',
    imageOptions: [],
    orgName: 'test',
    showLinkToApp: true,
  };
  const merged = { ...defaultProps, ...props };

  return renderWithMockStore({}, queries)(<AppDeploymentComponent {...merged} />);
};
describe('AppDeploymentComponent', () => {
  const user = userEvent.setup();
  it('should render', () => {
    render();
    expect(screen.getByText(`${textMock('app_deploy.environment')}`)).toBeInTheDocument();
  });

  it('should render with no deploy history', () => {
    render();
    expect(screen.getByText(textMock('app_deploy.no_app_deployed'))).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_deploy_table.deployed_version_history_empty'))
    ).toBeInTheDocument();
  });

  it('should render missing rights message if deployPermission is false', () => {
    render({ deployPermission: false });
    expect(screen.getByText(textMock('app_publish.missing_rights'))).toBeInTheDocument();
  });

  it('should render with deploy history', () => {
    const deployHistory: IDeployment[] = [
      {
        app: 'test-app',
        created: new Date().toDateString(),
        createdBy: 'test-user',
        envName: 'test',
        id: 'test-id',
        org: 'test-org',
        tagName: 'test',
        build: {
          id: 'test-id',
          finished: new Date().toDateString(),
          result: 'succeeded',
          status: 'Completed',
          started: new Date().toDateString(),
        },
        deployedInEnv: true,
      },
    ];
    render({ deployHistory });
    expect(screen.getByText(textMock('app_deploy.deployed_version'))).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_deploy_table.deployed_version_history'))
    ).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('should render error message if latest deploy failed', () => {
    const deployHistory: IDeployment[] = [
      {
        app: 'test-app',
        created: new Date().toDateString(),
        createdBy: 'test-user',
        envName: 'test',
        id: 'test-id',
        org: 'test-org',
        tagName: 'test',
        build: {
          id: 'test-id',
          finished: new Date().toDateString(),
          result: 'failed',
          status: 'failed',
          started: new Date().toDateString(),
        },
        deployedInEnv: false,
      },
    ];
    render({ deployHistory });
    expect(screen.getByText(textMock('app_deploy_messages.technical_error_1'))).toBeInTheDocument();
  });

  it('should should render error message if latest deploy succeeded but app is not reachable', () => {
    const deployHistory: IDeployment[] = [
      {
        app: 'test-app',
        created: new Date().toDateString(),
        createdBy: 'test-user',
        envName: 'test',
        id: 'test-id',
        org: 'test-org',
        tagName: 'test',
        build: {
          id: 'test-id',
          finished: new Date().toDateString(),
          result: 'succeeded',
          status: 'Completed',
          started: new Date().toDateString(),
        },
        deployedInEnv: false,
      },
    ];
    render({ deployHistory });
    expect(
      screen.getByText(textMock('app_deploy.deployed_version_unavailable'))
    ).toBeInTheDocument();
  });

  it('should render deploy dropdown with image options', async () => {
    const imageOptions: ImageOption[] = [
      {
        label: 'test1',
        value: 'test1',
      },
      {
        label: 'test2',
        value: 'test2',
      },
    ];
    render({ imageOptions });
    expect(screen.getByText(textMock('app_deploy_messages.choose_version'))).toBeInTheDocument();
    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();
    await act(() => user.click(dropdown));
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('should render spinner when deployment is in progress', () => {
    const deployHistory: IDeployment[] = [
      {
        app: 'test-app',
        created: new Date().toDateString(),
        createdBy: 'test-user',
        envName: 'test',
        id: 'test-id',
        org: 'test-org',
        tagName: 'test',
        build: {
          id: 'test-id',
          finished: null,
          result: 'inProgress',
          status: 'inProgress',
          started: new Date().toDateString(),
        },
        deployedInEnv: true,
      },
    ];
    render({ deployHistory });
    expect(
      screen.getByText(`${textMock('app_publish.deployment_in_progress')}...`)
    ).toBeInTheDocument();
  });

  it('should render error message if call to deployment endpoint fails', async () => {
    const imageOptions: ImageOption[] = [
      {
        label: 'test1',
        value: 'test1',
      },
      {
        label: 'test2',
        value: 'test2',
      },
    ];
    const queries: Partial<ServicesContextProps> = {
      createDeployment: jest.fn().mockRejectedValue(new Error('test error')),
    };
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    render({ imageOptions }, queries);
    expect(screen.getByText(textMock('app_deploy_messages.choose_version'))).toBeInTheDocument();
    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();
    await act(() => user.click(dropdown));
    await act(() => user.click(screen.getByText('test1')));
    await act(() =>
      user.click(
        screen.getByRole('button', { name: textMock('app_deploy_messages.btn_deploy_new_version') })
      )
    );
    await act(() => user.click(screen.getByRole('button', { name: 'Ja' })));
    expect(mockConsoleError).toHaveBeenCalled();
    expect(screen.getByText(textMock('app_deploy_messages.technical_error_1'))).toBeInTheDocument();
  });
});

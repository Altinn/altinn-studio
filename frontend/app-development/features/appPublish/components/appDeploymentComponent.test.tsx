import React from 'react';
import { AppDeploymentComponent, AppDeploymentComponentProps } from './appDeploymentComponent';
import { screen } from '@testing-library/react';
import { renderWithMockStore } from 'app-development/test/mocks';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { IDeployment } from 'app-development/sharedResources/appDeployment/types';

const render = (props?: Partial<AppDeploymentComponentProps>) => {
  const defaultProps: AppDeploymentComponentProps = {
    deployHistory: [],
    deployPermission: true,
    envName: 'test',
    imageOptions: [],
    orgName: 'test',
    showLinkToApp: true,
  };
  const merged = { ...defaultProps, ...props };

  return renderWithMockStore({}, {})(<AppDeploymentComponent {...merged} />);
};
describe('AppDeploymentComponent', () => {
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
});

/* tslint:disable:object-literal-key-quotes */
/* tslint:disable:no-string-literal */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';

jest.mock('../../shared/src/version-control/versionControlHeader');
import { DeployToTestContainer } from '../src/features/deploy/containers/deployToTestContainer';

describe('Deploy To Test container', () => {
  let mockClasses: any;
  let mockDeploymentList: any;
  let mockDeployStatus: any;
  let mockLanguage: any;
  let mockMasterRepoStatus: any;
  let mockRepoStatus: any;

  beforeEach(() => {
    mockClasses = {};
    mockLanguage = {};
    mockRepoStatus = {
      behindBy: 0,
      aheadBy: 0,
      contentStatus: [],
      repositoryStatus: 'Ok',
      hasMergeConflict: false,
    };

    mockDeploymentList = {
      'at21': {
        'items': [
          {
            'spec': {
              'template': {
                'spec': {
                  'containers': [
                    {
                      'name': 'example-repo',
                      'image': 'tddregistry.azurecr.io/tdd-helloworld:1',
                    },
                  ],
                },
              },
            },
          },
        ],
        fetchStatus: {
          error: null,
          success: null,
        },
      },
    };

    mockDeployStatus = {
      at21: {
        deployStartedSuccess: null,
        result: {
          status: null,
          startTime: null,
          finishTime: null,
          success: null,
          message: null,
          buildId: null,
        },
      },
    };

    mockMasterRepoStatus = {
      'commit': {
        'id': '2',
      },
    };
  });

  it('should render "Ready for deploy and all checks passed"', async () => {
    const wrapper = mount(
      <DeployToTestContainer
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    // Language test
    expect(wrapper.text()).toMatch('shared_with_org_true');

    // Assert renderRepoInSync part (local and master is in sync)
    expect(wrapper.exists('#renderInSync')).toEqual(true);
    const renderInSync = wrapper.find('#renderInSync');
    expect(renderInSync.exists('.ai-check')).toEqual(true);
    expect(renderInSync.exists('.fa-circle-exclamation')).toEqual(false);

    // Assert rendercSharpCompiles part
    expect(wrapper.exists('#rendercSharpCompiles')).toEqual(true);
    const rendercSharpCompiles = wrapper.find('#rendercSharpCompiles');
    expect(rendercSharpCompiles.exists('.ai-check')).toEqual(true);
    expect(rendercSharpCompiles.exists('.fa-circle-exclamation')).toEqual(false);

    // Assert the deploy button
    expect(wrapper.exists('#deployButton')).toEqual(true);
    const deployButton = wrapper.find('#deployButton');
    expect(deployButton.find('button').props()['disabled']).toEqual(false);
  });

  it('should render "Master repo and deploy is in sync, deploy disabled"', async () => {
    mockMasterRepoStatus = {
      'commit': {
        'id': '1',
      },
    };

    const wrapper = mount(
      <DeployToTestContainer
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    // Test language
    expect(wrapper.text()).toMatch('master_and_deploy_in_sync_title');

    // Assert renderRepoInSync part
    expect(wrapper.exists('#renderInSync')).toEqual(true);
    const renderInSync = wrapper.find('#renderInSync');
    expect(renderInSync.exists('.ai-check')).toEqual(true);
    expect(renderInSync.exists('.fa-circle-exclamation')).toEqual(false);

    // Assert rendercSharpCompiles part
    expect(wrapper.exists('#rendercSharpCompiles')).toEqual(false);

    // Assert the deploy button
    expect(wrapper.exists('button#deployButton')).toEqual(true);
    const deployButton = wrapper.find('button#deployButton');
    expect(deployButton.find('button#deployButton').props()['disabled']).toEqual(true);

  });

  it('should render "Local repo is ahead of master"', async () => {
    mockRepoStatus = {
      behindBy: 0,
      aheadBy: 0,
      contentStatus: ['some', 'data'],
      repositoryStatus: 'Ok',
      hasMergeConflict: false,
    };

    const wrapper = mount(
      <DeployToTestContainer
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    // Test language
    expect(wrapper.text()).toMatch('shared_with_org_false');

    // Assert renderRepoInSync part
    expect(wrapper.exists('#renderInSync')).toEqual(true);
    const renderInSync = wrapper.find('#renderInSync');
    expect(renderInSync.exists('.ai-check')).toEqual(false);
    expect(renderInSync.exists('.fa-circle-exclamation')).toEqual(true);

    // Assert rendercSharpCompiles part
    expect(wrapper.exists('#rendercSharpCompiles')).toEqual(true);
    const rendercSharpCompiles = wrapper.find('#rendercSharpCompiles');
    expect(rendercSharpCompiles.exists('.ai-check')).toEqual(true);
    expect(rendercSharpCompiles.exists('.fa-circle-exclamation')).toEqual(false);

    // Assert the deploy button
    expect(wrapper.exists('#deployButton')).toEqual(true);
    const deployButton = wrapper.find('#deployButton');
    expect(deployButton.find('button').props()['disabled']).toEqual(false);
  });

  it('should correctly render the "Deploy successfully" process', async () => {
    const wrapper = mount(
      <DeployToTestContainer
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    // Assert the deploy button
    expect(wrapper.exists('button#deployButton')).toEqual(true);
    let deployButton = wrapper.find('button#deployButton');
    expect(deployButton.find('button').props()['disabled']).toEqual(false);

    // Assert the altinnspinner
    expect(wrapper.exists('#DeploySpinner')).toEqual(false);

    // Mock successfull deployment start
    mockDeployStatus = {
      at21: {
        deployStartedSuccess: true,
        result: {
          status: null,
          startTime: null,
          finishTime: null,
          success: true,
          message: 'Deployment status: 7222',
          buildId: '7222',
        },
      },
    };

    wrapper.setProps({
      deployStatus: mockDeployStatus,
    });

    // Assert the deploy button, should be hidden
    expect(wrapper.exists('button#deployButton')).toEqual(false);

    // Assert the altinnspinner
    expect(wrapper.exists('#DeploySpinner')).toEqual(true);

    // Mock deployment inProgress
    mockDeployStatus = {
      at21: {
        deployStartedSuccess: true,
        result: {
          'status': 'inProgress',
          'startTime': '2019-04-11T17:26:12.3887035Z',
          'finishTime': null,
          'success': false,
          'message': 'Deployment status: inProgress',
          'buildId': '7236',
        },
      },
    };

    wrapper.setProps({
      deployStatus: mockDeployStatus,
    });

    // Assert the deploy button, should be hidden
    expect(wrapper.exists('button#deployButton')).toEqual(false);

    // Assert the altinnspinner
    expect(wrapper.exists('#DeploySpinner')).toEqual(true);

    // Mock deployment completed successfully
    mockDeployStatus = {
      at21: {
        deployStartedSuccess: true,
        result: {
          status: 'completed',
          startTime: '2019-04-11T12:52:10.2722025Z',
          finishTime: '2019-04-11T12:52:34.7263946Z',
          success: true,
          message: 'Deployment status: completed',
          buildId: '7222',
        },
      },
    };

    wrapper.setProps({
      deployStatus: mockDeployStatus,
    });

    // Assert the deploy button, should be hidden
    expect(wrapper.exists('button#deployButton')).toEqual(false);

    // Assert the altinnspinner
    expect(wrapper.exists('#DeploySpinner')).toEqual(false);

    // Assert language
    expect(wrapper.text()).toMatch('service_is_ready_for_test');

    // Assert circle check
    expect(wrapper.exists('.fa-circlecheck')).toEqual(true);

  });

  it('should "Fail deployment"', async () => {
    const wrapper = mount(
      <DeployToTestContainer
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    // Assert the deploy button
    expect(wrapper.exists('button#deployButton')).toEqual(true);
    expect(wrapper.find('button#deployButton').props()['disabled']).toEqual(false);

    // Mock successfull deployment start
    mockDeployStatus = {
      at21: {
        deployStartedSuccess: true,
        result: {
          status: null,
          startTime: null,
          finishTime: null,
          success: true,
          message: 'Deployment status: 7222',
          buildId: '7222',
        },
      },
    };

    wrapper.setProps({
      deployStatus: mockDeployStatus,
    });

    // Assert the deploy button, should be hidden
    expect(wrapper.exists('button#deployButton')).toEqual(false);

    // Assert the altinnspinner
    expect(wrapper.exists('#DeploySpinner')).toEqual(true);

    // Mock deployment completed successfully
    mockDeployStatus = {
      at21: {
        deployStartedSuccess: true,
        result: {
          'status': 'completed',
          'startTime': '2019-04-11T17:44:31.8583703Z',
          'finishTime': '2019-04-11T17:44:53.4667641Z',
          'success': false,
          'message': 'Deployment status: completed',
          'buildId': '7237',
        },
      },
    };

    wrapper.setProps({
      deployStatus: mockDeployStatus,
    });

    // Assert the deploy button, should be shown
    expect(wrapper.exists('button#deployButton')).toEqual(true);

    // Assert the altinnspinner, should be hidden
    expect(wrapper.exists('#DeploySpinner')).toEqual(false);

    // Assert language
    expect(wrapper.text()).toMatch('error_service_was_not_deployed_title');

    // Assert exclamation icon
    expect(wrapper.exists('.fa-circle-exclamation')).toEqual(true);

  });

  it('should unmount and mount during deployment successfully', async () => {
    const wrapper = mount(
      <DeployToTestContainer
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    const instance = wrapper.instance() as DeployToTestContainer;
    const spyOnFetchDeploymentStatusInterval = jest.spyOn(instance, 'fetchDeploymentStatusInterval');

    // Call the componentdDidMount() and assert that fetchDeploymentStatusInterval has not been called
    instance.componentDidMount();
    expect(spyOnFetchDeploymentStatusInterval).toHaveBeenCalledTimes(0);

    // Mock deployment inProgress
    mockDeployStatus = {
      at21: {
        deployStartedSuccess: true,
        result: {
          'status': 'inProgress',
          'startTime': '2019-04-11T17:26:12.3887035Z',
          'finishTime': null,
          'success': false,
          'message': 'Deployment status: inProgress',
          'buildId': '7236',
        },
      },
    };
    wrapper.setProps({
      deployStatus: mockDeployStatus,
    });

    expect(spyOnFetchDeploymentStatusInterval).toHaveBeenCalledTimes(0);

    // Assert the altinnspinner, should be shown
    expect(wrapper.exists('#DeploySpinner')).toEqual(true);

    wrapper.unmount();

    // Assert the altinnspinner, should be hidden
    expect(wrapper.exists('#DeploySpinner')).toEqual(false);

    // Mock the mount
    wrapper.mount();
    instance.componentDidMount();

    // Assert that the fetchDeploymentStatusInterval has been called
    expect(spyOnFetchDeploymentStatusInterval).toHaveBeenCalledTimes(1);

    // Assert the altinnspinner, should be shown
    expect(wrapper.exists('#DeploySpinner')).toEqual(true);

  });

});

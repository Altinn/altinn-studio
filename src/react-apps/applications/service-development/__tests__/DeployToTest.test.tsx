/* tslint:disable:object-literal-key-quotes */
/* tslint:disable:no-string-literal */
/* tslint:disable:max-line-length */
/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as networking from '../../shared/src/utils/networking';
import { DeployToTestContainer } from '../src/features/deploy/containers/deployToTestContainer';
jest.mock('../../shared/src/version-control/versionControlHeader');

describe('Deploy To Test container', () => {
  let mockClasses: any;
  let mockCompileStatus: any;
  let mockCompileStatusUniqueFilenames: any;
  let mockDeploymentList: any;
  let mockDeployStatus: any;
  let mockImageVersions: any;
  let mockLanguage: any;
  let mockMasterRepoStatus: any;
  let mockRepoStatus: any;

  let mockCurrentRepo: any;

  let getStub: any;
  let spyOnGetWritePermissiononRepoCall: any;

  beforeAll(() => {
    Object.defineProperty(window, 'service', {
      value: 'testerdeploy2',
    });
  });

  beforeEach(async () => {
    mockCurrentRepo = {
      'name': 'testerdeploy2',
      'permissions': {
        'admin': true,
        'pull': true,
        'push': true,
      },
    };

    getStub = jest.fn();
    spyOnGetWritePermissiononRepoCall = jest.spyOn(networking, 'get').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.resolve(mockCurrentRepo));

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

    mockImageVersions = {
      at21: '1',
    },

      mockMasterRepoStatus = {
        'commit': {
          'id': '2',
        },
      };

    mockCompileStatus = {
      fetchStatus: {
        error: null,
        success: true,
      },
      result: {
        assemblyName: null,
        compilationInfo: [],
        succeeded: true,
        warnings: 0,
        errors: 0,
        timeUsed: '00:00:01.7493568',
        compileStarted: '2019-04-26T15:26:53.8553131+02:00',
      },
    };

    mockCompileStatusUniqueFilenames = [];

  });

  afterEach(() => {
    spyOnGetWritePermissiononRepoCall.mockReset();
  });

  it('should render "Ready for deploy and all checks passed"', async () => {
    mockImageVersions = null;

    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

    // Assert Language shared with org
    expect(wrapper.text()).toMatch('shared_with_org_true');

    // Assert language for current version paper, no available service deployed
    expect(wrapper.text()).toMatch('service_not_available_in_test_env');

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
    expect(wrapper.text()).toMatch('check_csharp_compiles_true_title');

    // Assert the deploy button
    expect(wrapper.exists('#deployButton')).toEqual(true);
    expect(wrapper.find('button#deployButton').props()['disabled']).toEqual(false);
  });

  it('should render "Master repo and deploy is in sync, deploy disabled"', async () => {
    mockMasterRepoStatus = {
      'commit': {
        'id': '1',
      },
    };

    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

    // Test language
    expect(wrapper.text()).toMatch('master_and_deploy_in_sync_title');

    // Assert current version deployed
    expect(wrapper.text()).toMatch('current_version_title');

    // Assert renderRepoInSync part
    expect(wrapper.exists('#renderInSync')).toEqual(true);
    const renderInSync = wrapper.find('#renderInSync');
    expect(renderInSync.exists('.ai-check')).toEqual(true);
    expect(renderInSync.exists('.fa-circle-exclamation')).toEqual(false);

    // Assert rendercSharpCompiles part
    expect(wrapper.exists('#rendercSharpCompiles')).toEqual(false);

    // Assert the deploy button
    expect(wrapper.exists('button#deployButton')).toEqual(true);
    expect(wrapper.find('button#deployButton').props()['disabled']).toEqual(true);

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
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

    // Test language
    expect(wrapper.text()).toMatch('shared_with_org_false');

    // Assert renderRepoInSync part
    expect(wrapper.exists('#renderInSync')).toEqual(true);
    const renderInSync = wrapper.find('#renderInSync');
    expect(renderInSync.exists('.ai-check')).toEqual(false);
    expect(renderInSync.exists('.fa-info-circle')).toEqual(true);

    // Assert rendercSharpCompiles part
    expect(wrapper.exists('#rendercSharpCompiles')).toEqual(false);

    // Assert the deploy button
    expect(wrapper.exists('#deployButton')).toEqual(true);
    expect(wrapper.find('button#deployButton').props()['disabled']).toEqual(false);
  });

  it('should render "Local repo is behind master", showing deploy button when compile fails', async () => {
    mockRepoStatus = {
      behindBy: 1,
      aheadBy: 0,
      contentStatus: [],
      repositoryStatus: 'Ok',
      hasMergeConflict: false,
    };

    mockCompileStatus = {
      fetchStatus: {
        error: null,
        success: true,
      },
      result: {
        assemblyName: null,
        compilationInfo: [],
        succeeded: false,
        warnings: 0,
        errors: 0,
        timeUsed: '00:00:01.7493568',
        compileStarted: '2019-04-26T15:26:53.8553131+02:00',
      },
    };

    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

    // Test language
    expect(wrapper.text()).toMatch('changes_made_by_others_in_your_organisation_title');

    // Assert renderRepoInSync part
    expect(wrapper.exists('#renderInSync')).toEqual(true);
    const renderInSync = wrapper.find('#renderInSync');
    expect(renderInSync.exists('.ai-check')).toEqual(false);
    expect(renderInSync.exists('.fa-info-circle')).toEqual(true);

    // Assert rendercSharpCompiles part
    expect(wrapper.exists('#rendercSharpCompiles')).toEqual(false);

    // Assert the deploy button, should not be disabled even if compile fails
    expect(wrapper.exists('#deployButton')).toEqual(true);
    expect(wrapper.find('button#deployButton').props()['disabled']).toEqual(false);
  });

  it('should correctly render the "Deploy successfully" process', async () => {
    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

    const instance = wrapper.instance() as DeployToTestContainer;
    const spyOnFetchDeployments = jest.spyOn(instance, 'fetchDeployments');

    // Assert the deploy button
    expect(wrapper.exists('button#deployButton')).toEqual(true);
    expect(wrapper.find('button#deployButton').props()['disabled']).toEqual(false);

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

    expect(spyOnFetchDeployments).toHaveBeenCalledTimes(1);

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

    expect(spyOnFetchDeployments).toHaveBeenCalledTimes(2);

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

    expect(spyOnFetchDeployments).toHaveBeenCalledTimes(3);

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
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

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
    spyOnGetWritePermissiononRepoCall.mockRestore();

    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

    const instance = wrapper.instance() as DeployToTestContainer;
    const spyOnFetchDeploymentStatusInterval = jest.spyOn(instance, 'fetchDeploymentStatusInterval');

    // Mock getRepoPermissions to disable the networked subscription cancel when unmounting
    spyOnGetWritePermissiononRepoCall = jest.spyOn(instance, 'getRepoPermissions').mockReturnValue(Promise.resolve());

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
    wrapper.setState({ hasPushPermissionToRepo: true });

    // Assert that the fetchDeploymentStatusInterval has been called
    expect(spyOnFetchDeploymentStatusInterval).toHaveBeenCalledTimes(1);

    // Assert the altinnspinner, should be shown
    expect(wrapper.exists('#DeploySpinner')).toEqual(true);

    spyOnGetWritePermissiononRepoCall.mockRestore();
    spyOnFetchDeploymentStatusInterval.mockRestore();
  });

  it('should successfully render "compile success"', async () => {
    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

    // Assert language
    expect(wrapper.text()).toMatch('check_csharp_compiles_true_title');

  });

  it('should successfully render "compile failed"', async () => {
    mockCompileStatus = {
      fetchStatus: {
        error: null,
        success: true,
      },
      result: {
        assemblyName: null,
        compilationInfo: [
          {
            severity: 'Warning',
            filePath: 'C:/AltinnCore/Repos/matsgm/tdd/compiles/Implementation\\ServiceImplementation.cs',
            fileName: 'ServiceImplementation.cs',
            lineNumber: 12,
            info: 'The using directive for \'AltinnCore.ServiceLibrary.ServiceMetadata\' appeared previously in this namespace',
            code: 'CS0105',
            warningLevel: 3,
          },
          {
            severity: 'Error',
            filePath: 'C:/AltinnCore/Repos/matsgm/tdd/compiles/Implementation\\InstantiationHandler.cs',
            fileName: 'InstantiationHandler.cs',
            lineNumber: 11,
            info: 'The type or namespace name \'SERVICE_MODEL_NAME\' could not be found (are you missing a using directive or an assembly reference?)',
            code: 'CS0246',
            warningLevel: 0,
          },
        ],
        succeeded: false,
        warnings: 1,
        errors: 1,
        timeUsed: '00:00:00.2056210',
        compileStarted: '2019-04-26T15:35:00.7707663+02:00',
      },
    };

    mockCompileStatusUniqueFilenames = [
      'fileName1.cs',
      'fileName2.cs',
    ];

    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

    // Assert language
    expect(wrapper.text()).toMatch('check_csharp_compiles_false_title');

    // Assert rendercSharpCompiles part
    expect(wrapper.exists('#rendercSharpCompiles')).toEqual(true);
    const rendercSharpCompiles = wrapper.find('#rendercSharpCompiles');
    expect(rendercSharpCompiles.exists('.ai-check')).toEqual(false);
    expect(rendercSharpCompiles.exists('.fa-circle-exclamation')).toEqual(true);

    // Assert files
    expect(wrapper.text()).toMatch('fileName1.cs');
    expect(wrapper.text()).toMatch('fileName2.cs');
  });

  it('should run stop fetchDeploymentStatusInterval() successfully', async () => {
    spyOnGetWritePermissiononRepoCall.mockRestore();

    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

    const instance = wrapper.instance() as DeployToTestContainer;
    const spyOnFetchDeploymentStatusInterval = jest.spyOn(instance, 'fetchDeploymentStatusInterval');

    // Mock getRepoPermissions to disable the networked subscription cancel when unmounting
    jest.spyOn(instance, 'getRepoPermissions').mockImplementation(jest.fn());

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
    wrapper.setState({ hasPushPermissionToRepo: true });

    // Assert that the fetchDeploymentStatusInterval has been called
    expect(spyOnFetchDeploymentStatusInterval).toHaveBeenCalledTimes(1);

    // Assert the altinnspinner, should be shown
    expect(wrapper.exists('#DeploySpinner')).toEqual(true);

  });

  it('should dispatch fetchCompileStatus() when repostatus props changes', async () => {
    mockRepoStatus = {
      behindBy: 1,
      aheadBy: 0,
      contentStatus: ['some', 'data'],
      repositoryStatus: 'Ok',
      hasMergeConflict: false,
    };

    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

    const instance = wrapper.instance() as DeployToTestContainer;
    const spyOnFetchCompileStatus = jest.spyOn(instance, 'fetchCompileStatus');

    // Assert rendercSharpCompiles part
    expect(wrapper.exists('#rendercSharpCompiles')).toEqual(false);

    mockRepoStatus = {
      behindBy: 0,
      aheadBy: 0,
      contentStatus: ['some', 'data'],
      repositoryStatus: 'Ok',
      hasMergeConflict: false,
    };
    wrapper.setProps({
      repoStatus: mockRepoStatus,
    });

    expect(spyOnFetchCompileStatus).toHaveBeenCalledTimes(1);

    mockRepoStatus = {
      behindBy: 0,
      aheadBy: 0,
      contentStatus: ['some', 'data'],
      repositoryStatus: 'Ok',
      hasMergeConflict: false,
    };
    wrapper.setProps({
      repoStatus: mockRepoStatus,
    });

    // Assert that fetchCompileStatus() has not been called again when props has not changed
    expect(spyOnFetchCompileStatus).toHaveBeenCalledTimes(1);

  });

  it('should re-render currentVersion, when master repo and deploy in sync, and new changes are shared', async () => {
    mockMasterRepoStatus = {
      'commit': {
        'id': '1',
      },
    };

    mockRepoStatus = {
      behindBy: 0,
      aheadBy: 1,
      contentStatus: ['some', 'data'],
      repositoryStatus: 'Ok',
      hasMergeConflict: false,
    };

    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    wrapper.setState({ hasPushPermissionToRepo: true });

    const instance = wrapper.instance() as DeployToTestContainer;
    const spyOnFetchMasterRepoStatus = jest.spyOn(instance, 'fetchMasterRepoStatus');

    // Test in sync language
    expect(wrapper.text()).toMatch('master_and_deploy_in_sync_title');

    // Assert current version deployed
    expect(wrapper.text()).toMatch('current_version_title');

    // Assert the deploy button, should be disabled
    expect(wrapper.exists('button#deployButton')).toEqual(true);
    expect(wrapper.find('button#deployButton').props()['disabled']).toEqual(true);

    mockRepoStatus = {
      behindBy: 0,
      aheadBy: 0,
      contentStatus: [],
      repositoryStatus: 'Ok',
      hasMergeConflict: false,
    };

    mockMasterRepoStatus = {
      'commit': {
        'id': '2',
      },
    };

    wrapper.setProps({
      repoStatus: mockRepoStatus,
      masterRepoStatus: mockMasterRepoStatus,
    });

    expect(spyOnFetchMasterRepoStatus).toHaveBeenCalledTimes(1);

    // Assert Language shared with org
    expect(wrapper.text()).toMatch('shared_with_org_true');

    // Assert the deploy button, should NOT be disabled
    expect(wrapper.exists('button#deployButton')).toEqual(true);
    expect(wrapper.find('button#deployButton').props()['disabled']).toEqual(false);

  });

  it('should render correct when Push Permission are TRUE', async () => {
    mockImageVersions = null;

    mockCurrentRepo = {
      'name': 'testerdeploy2',
      'permissions': {
        'admin': true,
        'pull': true,
        'push': true,
      },
    };

    getStub.mockReturnValue(Promise.resolve(mockCurrentRepo));

    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    // Assert the writePermission
    expect(wrapper.state('hasPushPermissionToRepo')).toBeNull();
    // Assert network call
    expect(spyOnGetWritePermissiononRepoCall).toHaveBeenCalledTimes(1);

    // Assert the Checking for permission spinner and text
    expect(wrapper.exists('#checkingForWritePermissionSpinner')).toEqual(true);
    expect(wrapper.text()).toMatch('write_permission_checking');

    // Resolve network call
    await Promise.resolve();
    expect(wrapper.state('hasPushPermissionToRepo')).toBeTruthy();

    // Remount with new state
    wrapper.mount();

    // Assert the deploy button
    expect(wrapper.exists('#deployButton')).toEqual(true);
    expect(wrapper.find('button#deployButton').props()['disabled']).toEqual(false);
  });

  it('should render correct when Push Permission are FALSE', async () => {
    mockImageVersions = null;

    mockCurrentRepo = {
      'name': 'testerdeploy2',
      'permissions': {
        'admin': true,
        'pull': true,
        'push': false,
      },
    };

    getStub = jest.fn();
    spyOnGetWritePermissiononRepoCall = jest.spyOn(networking, 'get').mockImplementation(getStub);
    getStub.mockReturnValue(Promise.resolve(mockCurrentRepo));

    const wrapper = mount(
      <DeployToTestContainer
        compileStatus={mockCompileStatus}
        compileStatusUniqueFilenames={mockCompileStatusUniqueFilenames}
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        deployStatus={mockDeployStatus}
        imageVersions={mockImageVersions}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    // Assert the writePermission
    expect(wrapper.state('hasPushPermissionToRepo')).toBeNull();
    // Assert network call
    expect(spyOnGetWritePermissiononRepoCall).toHaveBeenCalledTimes(1);
    // Resolve network call
    await Promise.resolve();
    expect(wrapper.state('hasPushPermissionToRepo')).toBeFalsy();

    // Remount with new state
    wrapper.mount();

    // Assert the No Deploy Permission
    expect(wrapper.exists('#renderNoDeployPermission')).toEqual(true);
    expect(wrapper.text()).toMatch('write_permission_false');
  });

});

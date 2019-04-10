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
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    expect(wrapper.text()).toMatch('Du har delt dine endringer');

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

  it('should render "Last commit in master is deployed, deploy disabled"', async () => {
    mockMasterRepoStatus = {
      'commit': {
        'id': '1',
      },
    };

    const wrapper = mount(
      <DeployToTestContainer
        classes={mockClasses}
        deploymentList={mockDeploymentList}
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    expect(wrapper.text()).toMatch('Du har delt dine endringer');

    // Assert renderRepoInSync part
    expect(wrapper.exists('#renderInSync')).toEqual(true);
    const renderInSync = wrapper.find('#renderInSync');
    expect(renderInSync.exists('.ai-check')).toEqual(true);
    expect(renderInSync.exists('.fa-circle-exclamation')).toEqual(false);

    // Assert rendercSharpCompiles part
    expect(wrapper.exists('#rendercSharpCompiles')).toEqual(false);

    // Assert the deploy button
    expect(wrapper.exists('#deployButton')).toEqual(true);
    const deployButton = wrapper.find('#deployButton');
    expect(deployButton.find('button').props()['disabled']).toEqual(true);

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
        language={mockLanguage}
        masterRepoStatus={mockMasterRepoStatus}
        repoStatus={mockRepoStatus}
      />,
    );

    // TODO CREATE LANGUAGE ASSERTIONS

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

});

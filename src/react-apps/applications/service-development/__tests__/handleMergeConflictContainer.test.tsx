import { mount } from 'enzyme';
import { Action } from 'history';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import * as networking from '../../shared/src/utils/networking';

import HandleMergeConflictContainer from '../src/features/handleMergeConflict/HandleMergeConflictContainer';

describe('when repoStatus returns files and hasMergeConflict = true', () => {
  let mockLanguage: any;
  let mockResult: any;
  let mockStore: any;

  const initialState = {
    mockLanguage: {},
    mockResult = {
      behindBy: 1,
      aheadBy: 3,
      contentStatus: [
        {
          filePath: 'Model/ServiceModel.cs',
          fileStatus: 'ModifiedInWorkdir',
        },
        {
          filePath: 'Resources/FormLayout.json',
          fileStatus: 'Conflicted',
        },
        {
          filePath: 'Resources/react-app.css',
          fileStatus: 'ModifiedInWorkdir',
        },
      ],
      repositoryStatus: 'MergeConflict',
      hasMergeConflict: true,
    };
  }

  beforeEach(() => {
    mockClasses = {};
    mockLanguage = { dashboard: {} };
    mockRepoStatus = {
      behindBy: 1,
      aheadBy: 3,
      contentStatus: [
        {
          filePath: 'Model/ServiceModel.cs',
          fileStatus: 'ModifiedInWorkdir',
        },
        {
          filePath: 'Resources/FormLayout.json',
          fileStatus: 'Conflicted',
        },
        {
          filePath: 'Resources/react-app.css',
          fileStatus: 'ModifiedInWorkdir',
        },
      ],
      repositoryStatus: 'MergeConflict',
      hasMergeConflict: true,
    };
  });

  it('should list files', () => {
    const mountedComponent = mount(
      <HandleMergeConflictContainer
      />,
    );
  });
});

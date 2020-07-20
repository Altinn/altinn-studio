import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';

import { HandleMergeConflictFileList } from '../../features/handleMergeConflict/components/HandleMergeConflictFileList';

describe('HandleMergeConflictFileList', () => {
  let mockClasses: any;
  let mockLanguage: any;
  let mockRepostatus: any;

  let mockChangeSelectedFile: (file: string) => void;

  beforeEach(() => {
    mockLanguage = {};
    mockRepostatus = {};
    mockClasses = {};
    mockChangeSelectedFile = jest.fn();
  });

  it('should render 3 files', async () => {
    mockChangeSelectedFile = jest.fn();

    mockRepostatus = {
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

    const wrapper = mount(
      <HandleMergeConflictFileList
        changeSelectedFile={mockChangeSelectedFile}
        classes={mockClasses}
        language={mockLanguage}
        repoStatus={mockRepostatus}
      />,
    );

    // Expect file list to show
    expect(wrapper.exists('#handleMergeConflictFileList')).toEqual(true);

    // Expect to have 3 listitems
    expect(wrapper.find('WithStyles(ForwardRef(ListItem))')).toHaveLength(mockRepostatus.contentStatus.length);

  });

  it('should render correct text in fileListItem', async () => {
    mockChangeSelectedFile = jest.fn();

    mockRepostatus = {
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

    const wrapper = mount(
      <HandleMergeConflictFileList
        changeSelectedFile={mockChangeSelectedFile}
        classes={mockClasses}
        language={mockLanguage}
        repoStatus={mockRepostatus}
      />,
    );

    // Expect file list to exist
    expect(wrapper.exists('#handleMergeConflictFileList')).toEqual(true);

    // Expect filePaths to be found as text
    mockRepostatus.contentStatus.map((item: any) => {
      expect(wrapper.text()).toMatch(item.filePath);
    });

  });

  it('should show correct icons', async () => {
    mockChangeSelectedFile = jest.fn();

    mockRepostatus = {
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

    const wrapper = mount(
      <HandleMergeConflictFileList
        changeSelectedFile={mockChangeSelectedFile}
        classes={mockClasses}
        language={mockLanguage}
        repoStatus={mockRepostatus}
      />,
    );

    // Expect file list to exist
    expect(wrapper.exists('#handleMergeConflictFileList')).toEqual(true);

    // Expect correct icons to show
    expect(wrapper.getDOMNode().getElementsByClassName('fa-check').length).toBe(2);
    expect(wrapper.getDOMNode().getElementsByClassName('fa-circlecancel').length).toBe(1);
  });

  it('should trigger handleListItemClick() when listItem is clicked', async () => {
    mockChangeSelectedFile = jest.fn();

    mockRepostatus = {
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

    const wrapper = mount(
      <HandleMergeConflictFileList
        changeSelectedFile={mockChangeSelectedFile}
        classes={mockClasses}
        language={mockLanguage}
        repoStatus={mockRepostatus}
      />,
    );

    const instance = wrapper.instance() as HandleMergeConflictFileList;

    // Spies
    const spyOnHandleListItemClick = jest.spyOn(instance, 'handleListItemClick');

    // Expect file list to exist
    expect(wrapper.exists('#handleMergeConflictFileList')).toEqual(true);

    wrapper.find('.MuiButtonBase-root#handleMergeConflictFileListItem0').simulate('click');
    expect(spyOnHandleListItemClick).toHaveBeenCalled();
    expect(instance.state.selectedIndex).toEqual(0);
    expect(mockChangeSelectedFile).toHaveBeenCalled();
  });

  it('should render nothing when repoStatus.contentStatus is null', async () => {
    mockChangeSelectedFile = jest.fn();

    mockRepostatus = {
      contentStatus: null,
    };

    const wrapper = mount(
      <HandleMergeConflictFileList
        changeSelectedFile={mockChangeSelectedFile}
        classes={mockClasses}
        language={mockLanguage}
        repoStatus={mockRepostatus}
      />,
    );

    // Expect file list to not exist
    expect(wrapper.exists('#handleMergeConflictFileList')).toEqual(false);

  });

  it('should render list, no items, when repoStatus.contentStatus.length is 0', async () => {
    mockChangeSelectedFile = jest.fn();

    mockRepostatus = {
      contentStatus: [],
    };

    const wrapper = mount(
      <HandleMergeConflictFileList
        changeSelectedFile={mockChangeSelectedFile}
        classes={mockClasses}
        language={mockLanguage}
        repoStatus={mockRepostatus}
      />,
    );

    // Expect file list to not exist
    expect(wrapper.exists('#handleMergeConflictFileList')).toEqual(true);
    expect(wrapper.exists('#handleMergeConflictFileListItem0')).toEqual(false);

  });

});

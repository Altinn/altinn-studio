import React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ResetRepoModal from './ResetRepoModal';
import type { IResetRepoModalProps } from './ResetRepoModal';

describe('ResetRepoModal', () => {
  let mockLanguage: any;
  let mockStore: any;
  let mockAnchorEl: any;
  const mockRepoName = 'TestRepo';
  const mockFunc = jest.fn();

  beforeEach(() => {
    const createStore = configureStore();
    const initialState: any = {
      repoStatus: {
        resetting: false,
      },
    };
    mockStore = createStore(initialState);
    mockLanguage = {
      administration: {
        reset_repo_button: 'Slett mine endringer',
        reset_repo_confirm_repo_name: 'Skriv inn repo-navn',
      },
    };
    mockAnchorEl = document.querySelector('body');
  });

  const RenderResetRepoModal = (
    props: Partial<IResetRepoModalProps>,
  ): JSX.Element => {
    const defaultProps = {
      anchorEl: mockAnchorEl,
      handleClickResetRepo: mockFunc,
      language: mockLanguage,
      onClose: mockFunc,
      open: true,
      repositoryName: mockRepoName,
    };
    return (
      <Provider store={mockStore}>
        <ResetRepoModal {...defaultProps} {...props} />
      </Provider>
    );
  };

  it('renders the component', () => {
    const wrapper = mount(<RenderResetRepoModal />);
    expect(wrapper.getDOMNode()).toMatchSnapshot();
  });
});

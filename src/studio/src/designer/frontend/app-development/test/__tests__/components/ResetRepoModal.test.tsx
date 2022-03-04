/* eslint-disable no-undef */
/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import 'jest';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import '@testing-library/jest-dom/extend-expect';
import ResetRepoModal, {
  IResetRepoModalProps,
} from '../../../features/administration/components/ResetRepoModal';

describe('<ResetRepoModal /> spec', () => {
  let mockLanguage: any;
  let mockStore: any;
  let mockAnchorEl: any;
  let mockFunc: () => {};
  let mockRepoName: 'TestRepo';

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

import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import type { IResetRepoModalProps } from './ResetRepoModal';
import ResetRepoModal from './ResetRepoModal';
import { render, screen } from '@testing-library/react';

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
    render(<RenderResetRepoModal />);
    const resetRepoContainer = screen.getByTestId('reset-repo-container');
    expect(resetRepoContainer).toBeDefined();
  });
});

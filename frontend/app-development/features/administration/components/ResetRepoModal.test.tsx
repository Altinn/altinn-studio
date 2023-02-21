import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import type { IResetRepoModalProps } from './ResetRepoModal';
import { ResetRepoModal } from './ResetRepoModal';
import { render, screen } from '@testing-library/react';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';

jest.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation({
    'administration.reset_repo_button': 'Slett mine endringer',
    'administration.reset_repo_confirm_repo_name': 'Skriv inn reponavn',
  }),
}));

describe('ResetRepoModal', () => {
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
    mockAnchorEl = {
      // eslint-disable-next-line testing-library/no-node-access
      current: document.querySelector('body'),
    };
  });

  const RenderResetRepoModal = (props: Partial<IResetRepoModalProps>): JSX.Element => {
    const defaultProps = {
      anchorRef: mockAnchorEl,
      handleClickResetRepo: mockFunc,
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

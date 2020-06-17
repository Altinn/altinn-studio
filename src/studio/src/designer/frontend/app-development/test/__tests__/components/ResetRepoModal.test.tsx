/* eslint-disable no-undef */
/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import 'jest';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'
import ResetRepoModal, { IResetRepoModalProps } from '../../../features/administration/components/ResetRepoModal';

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

    document.body.innerHTML = `
    <div id="TestID">
      <span>Test</span>
    </div`;
    mockAnchorEl = document.getElementById('TestID');
  });

  it('renders the component', () => {
    const { container } = render(
      <RenderResetRepoModal />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('Popover should be visible when props.open===true', () => {
    const { getByTestId } = render(
      <RenderResetRepoModal />,
    );
    expect(getByTestId('reset-repo-popover')).toBeVisible();
  });

  it('Popover should NOT be visible when props.open===false', () => {
    const { getByTestId } = render(
      <RenderResetRepoModal open={false} />,
    );
    expect(getByTestId('reset-repo-popover')).not.toBeInTheDocument();
  });

  const RenderResetRepoModal = (props?: Partial<IResetRepoModalProps>): JSX.Element => {
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
        <ResetRepoModal {...defaultProps} {...props}/>
      </Provider>
    );
  };
});

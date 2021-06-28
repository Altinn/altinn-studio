/* eslint-disable no-undef */
/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import 'jest';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import '@testing-library/jest-dom/extend-expect';
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
    mockLanguage = {
      administration: {
        reset_repo_button: 'Slett mine endringer',
        reset_repo_confirm_repo_name: 'Skriv inn repo-navn',
      },
    };
    console.log(`WE FOUND A ${document}`);
    mockAnchorEl = document.getElementsByTagName('body');
    console.log(mockAnchorEl, process.env.NODE_ENV);
  });

  it('renders the component', () => {
    const wrapper = mount(<RenderResetRepoModal />);
    expect(wrapper.getDOMNode()).toMatchSnapshot();
  });

  // it('Popover should be visible when props.open===true', () => {
  //   const { getByTestId } = render(
  //     <RenderResetRepoModal />,
  //   );
  //   expect(getByTestId('reset-repo-popover')).toBeVisible();
  // });

  // it('Popover should NOT be visible when props.open===false', () => {
  //   const { queryByTestId } = render(
  //     <RenderResetRepoModal open={false} />,
  //   );
  //   expect(queryByTestId('reset-repo-popover')).toBeNull();
  // });

  // it('Reset button should be disabled by default', () => {
  //   const { getAllByRole } = render(
  //     <RenderResetRepoModal />,
  //   );
  //   expect(getAllByRole('button')[0]).toBeDisabled();
  // });

  // it('Reset button should be enabled when repo name is typed in', async () => {
  //   const utils = render(
  //     <RenderResetRepoModal />,
  //   );
  //   const input = utils.getByLabelText(mockLanguage.administration.reset_repo_confirm_repo_name);
  //   fireEvent.change(input, { target: { value: 'TestRepo' } });
  //   await waitFor(() => expect((input as HTMLInputElement).value).toEqual('TestRepo'), { container: utils.container });
  // });

  const RenderResetRepoModal = (props: Partial<IResetRepoModalProps>): JSX.Element => {
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
});

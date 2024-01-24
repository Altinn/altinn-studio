import React from 'react';
import type { IResetRepoModalProps } from './ResetRepoModal';
import { ResetRepoModal } from './ResetRepoModal';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithMockStore } from 'app-development/test/mocks';

import { mockUseTranslation } from '../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import * as testids from '../../../testing/testids';

const user = userEvent.setup();

const resetModalHeading = 'Reset repository';
const resetModalConfirmInfo = 'Are you sure you want to reset the test repository?';
const resetModalConfirmRepoName = 'Type repository name to confirm';
const resetModalButton = 'Reset repository';
const resetModalCancel = 'Cancel';

const texts = {
  'overview.reset_repo_confirm_heading': resetModalHeading,
  'overview.reset_repo_confirm_info': resetModalConfirmInfo,
  'overview.reset_repo_confirm_repo_name': resetModalConfirmRepoName,
  'overview.reset_repo_button': resetModalButton,
  'general.cancel': resetModalCancel,
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    ...mockUseTranslation(texts),
    i18n: {
      exists: (key: string) => texts[key] !== undefined,
    },
  }),
  Trans: ({ i18nKey }: { i18nKey: any }) => texts[i18nKey],
}));

describe('ResetRepoModal', () => {
  let mockAnchorEl: any;
  const mockRepoName = 'TestRepo';
  const mockFunc = jest.fn();

  beforeEach(() => {
    mockAnchorEl = {
      // eslint-disable-next-line testing-library/no-node-access
      current: document.querySelector('body'),
    };
  });

  const render = (
    props?: Partial<IResetRepoModalProps>,
    queries?: Partial<ServicesContextProps>,
  ) => {
    const defaultProps = {
      anchorRef: mockAnchorEl,
      handleClickResetRepo: mockFunc,
      onClose: mockFunc,
      open: true,
      repositoryName: mockRepoName,
      org: 'testOrg',
    };
    return renderWithMockStore({}, queries)(<ResetRepoModal {...defaultProps} {...props} />);
  };

  it('renders the component', () => {
    render();
    const resetRepoContainer = screen.getByTestId(testids.resetRepoContainer);
    expect(resetRepoContainer).toBeDefined();
  });

  it('renders the reset my changes button as disabled when repo name is not entered', () => {
    render();
    const resetRepoButton = screen.getByRole('button', {
      name: resetModalButton,
    });
    expect(resetRepoButton).toBeDisabled();
  });

  it('renders the reset my changes button as disabled when incorrect repo name is entered', async () => {
    render();
    const repoNameInput = screen.getByLabelText(resetModalConfirmRepoName);
    await act(() => user.type(repoNameInput, 'notTheRepoName'));
    const resetRepoButton = screen.getByRole('button', {
      name: resetModalButton,
    });
    expect(resetRepoButton).toBeDisabled();
  });

  it('enables the reset my changes button when repo name is entered', async () => {
    render();
    const repoNameInput = screen.getByLabelText(resetModalConfirmRepoName);
    await act(() => user.type(repoNameInput, mockRepoName));
    const resetRepoButton = screen.getByRole('button', {
      name: resetModalButton,
    });
    expect(resetRepoButton).toBeEnabled();
  });

  it('calls the reset mutation when reset button is clicked', async () => {
    const resetRepoChanges = jest.fn();
    const mockQueries: Partial<ServicesContextProps> = {
      resetRepoChanges,
    };
    render({}, mockQueries);
    const repoNameInput = screen.getByLabelText(resetModalConfirmRepoName);
    await act(() => user.type(repoNameInput, mockRepoName));
    await act(() => user.click(screen.getByRole('button', { name: resetModalButton })));
    expect(resetRepoChanges).toHaveBeenCalled();
  });

  it('renders the success message after reset is completed', async () => {
    render();
    const repoNameInput = screen.getByLabelText(resetModalConfirmRepoName);
    await act(() => user.type(repoNameInput, mockRepoName));
    await act(() => user.click(screen.getByRole('button', { name: resetModalButton })));
    expect(await screen.findByText('overview.reset_repo_completed')).toBeInTheDocument();
  });
});

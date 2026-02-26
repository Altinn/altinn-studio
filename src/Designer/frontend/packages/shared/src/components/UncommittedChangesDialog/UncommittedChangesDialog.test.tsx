import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UncommittedChangesDialogProps } from './UncommittedChangesDialog';
import { UncommittedChangesDialog } from './UncommittedChangesDialog';
import type { UncommittedChangesError, UncommittedFile } from 'app-shared/types/api/BranchTypes';
import { textMock } from '@studio/testing/mocks/i18nMock';

const onClose = jest.fn();
const onDiscardAndSwitch = jest.fn();
const filePath1 = 'App/ui/form/layouts/Side1.json';
const filePath2 = 'App/ui/form/layouts/Side2.json';
const fileStatus1 = 'ModifiedInWorkdir';
const fileStatus2 = 'DeletedFromWorkdir';
const uncommittedFiles: UncommittedFile[] = [
  {
    filePath: filePath1,
    status: fileStatus1,
  },
  {
    filePath: filePath2,
    status: fileStatus2,
  },
];
const error: UncommittedChangesError = {
  error: 'Cannot switch branches with uncommitted changes',
  message: 'You have uncommitted changes',
  uncommittedFiles,
  currentBranch: 'feat/new-feature',
  targetBranch: 'master',
};

describe('UncommittedChangesDialog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render dialog', () => {
    renderUncommittedChangesDialog();
    const dialog = getDialog();
    expect(dialog).toBeInTheDocument();
  });

  it('should render dialog content', () => {
    renderUncommittedChangesDialog();

    const dialogHeading = getDialogHeading();
    const alert = screen.getByText(textMock('branching.uncommitted_changes_dialog.alert'));
    const filesHeading = getFilesHeading();
    const discardChangesButton = getDiscardChangesButton();
    const cancelButton = getCancelButton();

    expect(dialogHeading).toBeInTheDocument();
    expect(alert).toBeInTheDocument();
    expect(filesHeading).toBeInTheDocument();
    expect(discardChangesButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });

  it('should render file paths and statuses', () => {
    renderUncommittedChangesDialog();

    const path1 = screen.getByText(filePath1);
    const path2 = screen.getByText(filePath2);
    const status1 = screen.getByText(fileStatus1);
    const status2 = screen.getByText(fileStatus2);

    expect(path1).toBeInTheDocument();
    expect(path2).toBeInTheDocument();
    expect(status1).toBeInTheDocument();
    expect(status2).toBeInTheDocument();
  });

  it('should call onClose when pressing cancel button', async () => {
    const user = userEvent.setup();
    renderUncommittedChangesDialog();

    const cancelButton = getCancelButton();
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should display a browser confirm alert when pressing discard changes button', async () => {
    const user = userEvent.setup();
    const confirm = jest.spyOn(window, 'confirm').mockImplementation();
    renderUncommittedChangesDialog();

    const discardChangesButton = getDiscardChangesButton();
    await user.click(discardChangesButton);

    expect(confirm).toHaveBeenCalledWith(
      textMock('branching.uncommitted_changes_dialog.confirm_discard'),
    );
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('should call onDiscardAndSwitch when confirming the browser alert', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderUncommittedChangesDialog();

    const discardChangesButton = getDiscardChangesButton();
    await user.click(discardChangesButton);

    expect(onDiscardAndSwitch).toHaveBeenCalledTimes(1);
    expect(onDiscardAndSwitch).toHaveBeenCalledWith(error.targetBranch);
  });

  it('should not call onDiscardAndSwitch when canceling the browser alert', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    renderUncommittedChangesDialog();

    const discardChangesButton = getDiscardChangesButton();
    await user.click(discardChangesButton);

    expect(onDiscardAndSwitch).not.toHaveBeenCalled();
  });

  it('should alter button label when isLoading is true', async () => {
    renderUncommittedChangesDialog({ isLoading: true });

    const loadingButton = getLoadingButton();
    const discardChangesButton = queryDiscardChangesButton();

    expect(loadingButton).toBeInTheDocument();
    expect(loadingButton).toBeDisabled();
    expect(discardChangesButton).not.toBeInTheDocument();
  });
});

const defaultProps: UncommittedChangesDialogProps = {
  error,
  onClose,
  onDiscardAndSwitch,
  isLoading: false,
};

const renderUncommittedChangesDialog = (props?: Partial<UncommittedChangesDialogProps>) => {
  return render(<UncommittedChangesDialog {...defaultProps} {...props} />);
};

const getDialog = () => screen.getByRole('dialog');

const getDialogHeading = () =>
  screen.getByRole('heading', {
    name: textMock('branching.uncommitted_changes_dialog.heading'),
  });

const getFilesHeading = () =>
  screen.getByRole('heading', {
    name: textMock('branching.uncommitted_changes_dialog.uncommitted_files', { count: 2 }),
  });

const getDiscardChangesButton = () =>
  screen.getByRole('button', {
    name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
  });

const queryDiscardChangesButton = () =>
  screen.queryByRole('button', {
    name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
  });

const getCancelButton = () =>
  screen.getByRole('button', {
    name: textMock('branching.uncommitted_changes_dialog.cancel'),
  });

const getLoadingButton = () =>
  screen.getByRole('button', {
    name: textMock('general.loading'),
  });

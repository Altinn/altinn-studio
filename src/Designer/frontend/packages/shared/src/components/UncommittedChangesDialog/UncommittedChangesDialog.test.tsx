import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UncommittedChangesDialogProps } from './UncommittedChangesDialog';
import { UncommittedChangesDialog } from './UncommittedChangesDialog';
import { org, app } from '@studio/testing/testids';
import type { UncommittedChangesError, UncommittedFile } from 'app-shared/types/api/BranchTypes';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const onClose = jest.fn();
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

const targetBranch = 'master';

const error: UncommittedChangesError = {
  error: 'Cannot switch branches with uncommitted changes',
  message: 'You have uncommitted changes',
  uncommittedFiles,
  currentBranch: 'feat/new-feature',
  targetBranch,
};

describe('UncommittedChangesDialog', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: jest.fn() },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('should render dialog', () => {
    renderUncommittedChangesDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });

  it('should render headings', () => {
    renderUncommittedChangesDialog();

    const dialogHeading = screen.getByRole('heading', {
      name: textMock('branching.uncommitted_changes_dialog.heading'),
    });
    const filesHeading = screen.getByRole('heading', {
      name: textMock('branching.uncommitted_changes_dialog.uncommitted_files', { count: 2 }),
    });

    expect(dialogHeading).toBeInTheDocument();
    expect(filesHeading).toBeInTheDocument();
  });

  it('should render alert', () => {
    renderUncommittedChangesDialog();
    const alert = screen.getByText(textMock('branching.uncommitted_changes_dialog.alert'));
    expect(alert).toBeInTheDocument();
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

  it('should render buttons', () => {
    renderUncommittedChangesDialog();

    const cancelButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.cancel'),
    });
    const discardChangesButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
    });

    expect(cancelButton).toBeInTheDocument();
    expect(discardChangesButton).toBeInTheDocument();
  });

  it('should call onClose when pressing cancel button', async () => {
    const user = userEvent.setup();
    renderUncommittedChangesDialog();

    const cancelButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.cancel'),
    });

    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should display a browser confirm alert when pressing discard changes button', async () => {
    const user = userEvent.setup();
    const confirm = jest.spyOn(window, 'confirm').mockImplementation();
    renderUncommittedChangesDialog();

    const discardChangesButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
    });

    await user.click(discardChangesButton);

    expect(confirm).toHaveBeenCalledWith(
      textMock('branching.uncommitted_changes_dialog.confirm_discard'),
    );
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('should not call discard changes query when canceling the browser alert', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    renderUncommittedChangesDialog();

    const discardChangesButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
    });

    await user.click(discardChangesButton);

    expect(queriesMock.discardChanges).not.toHaveBeenCalled();
  });

  it('should call discard changes query when confirming the browser alert', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderUncommittedChangesDialog();

    const discardChangesButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
    });

    await user.click(discardChangesButton);

    expect(queriesMock.discardChanges).toHaveBeenCalledTimes(1);
  });

  it('should call checkout branch query after successfully discarding changes', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderUncommittedChangesDialog();

    const discardChangesButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
    });

    await user.click(discardChangesButton);

    expect(queriesMock.checkoutBranch).toHaveBeenCalledWith(org, app, targetBranch);
    expect(queriesMock.checkoutBranch).toHaveBeenCalledTimes(1);
  });

  it('should refresh the page when calling the checkout query', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderUncommittedChangesDialog();

    const discardChangesButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
    });

    await user.click(discardChangesButton);

    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('should disable discard button and show loading text when discard changes query is pending', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    (queriesMock.discardChanges as jest.Mock).mockImplementation(() => new Promise(() => {}));

    renderUncommittedChangesDialog();

    const discardChangesButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
    });

    await user.click(discardChangesButton);

    const loadingButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.discarding'),
    });

    expect(loadingButton).toBeInTheDocument();
    expect(loadingButton).toBeDisabled();
  });

  it('should disable discard button and show loading text when checkout branch query is pending', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    (queriesMock.checkoutBranch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    renderUncommittedChangesDialog();

    const discardChangesButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
    });

    await user.click(discardChangesButton);

    const loadingButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.discarding'),
    });

    expect(loadingButton).toBeInTheDocument();
    expect(loadingButton).toBeDisabled();
  });
});

const defaultProps: UncommittedChangesDialogProps = {
  error,
  targetBranch,
  onClose,
  org,
  app,
};

const renderUncommittedChangesDialog = (props?: UncommittedChangesDialogProps) => {
  return render(
    <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
      <UncommittedChangesDialog {...defaultProps} {...props} />
    </ServicesContextProvider>,
  );
};

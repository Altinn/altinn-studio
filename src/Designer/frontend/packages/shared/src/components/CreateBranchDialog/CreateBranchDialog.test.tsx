import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CreateBranchDialogProps } from './CreateBranchDialog';
import { CreateBranchDialog } from './CreateBranchDialog';
import { org, app } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const onClose = jest.fn();

describe('CreateBranchDialog', () => {
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
    renderCreateBranchDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });

  it('should render heading', () => {
    renderCreateBranchDialog();
    const heading = screen.getByRole('heading', {
      name: textMock('branching.new_branch_dialog.create'),
    });
    expect(heading).toBeInTheDocument();
  });

  it('should render buttons', () => {
    renderCreateBranchDialog();

    const cancelButton = screen.getByRole('button', {
      name: textMock('general.cancel'),
    });
    const createButton = screen.getByRole('button', {
      name: textMock('branching.new_branch_dialog.create'),
    });

    expect(cancelButton).toBeInTheDocument();
    expect(createButton).toBeInTheDocument();
  });

  it('should call onClose when pressing cancel button', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog();

    const cancelButton = screen.getByRole('button', {
      name: textMock('general.cancel'),
    });

    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should display error when branch name is invalid', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog();

    const textfield = screen.getByLabelText(
      textMock('branching.new_branch_dialog.branch_name_label'),
    );
    const createButton = screen.getByRole('button', {
      name: textMock('branching.new_branch_dialog.create'),
    });

    await user.type(textfield, 'branch name with spaces');
    await user.click(createButton);

    const errorMessage = await screen.findByText(
      textMock('branching.new_branch_dialog.error_invalid_chars'),
    );
    expect(errorMessage).toBeInTheDocument();
  });

  it('should call create branch query when pressing create button', async () => {
    const user = userEvent.setup();

    renderCreateBranchDialog();

    const textfield = screen.getByLabelText(
      textMock('branching.new_branch_dialog.branch_name_label'),
    );
    const createButton = screen.getByRole('button', {
      name: textMock('branching.new_branch_dialog.create'),
    });

    await user.type(textfield, 'new-branch');
    await user.click(createButton);

    expect(queriesMock.createBranch).toHaveBeenCalledTimes(1);
    expect(queriesMock.createBranch).toHaveBeenCalledWith(org, app, 'new-branch');
  });

  it('should display UncommitedChangesDialog when there are uncommited changes', async () => {
    const user = userEvent.setup();

    const uncommittedChangesError = {
      uncommittedFiles: [
        {
          filePath: 'App/ui/form/layouts/Side1.json',
          status: 'ModifiedInWorkdir',
        },
      ],
    };

    const checkoutBranchMutationResponse = {
      response: {
        status: 409,
        data: uncommittedChangesError,
      },
    };

    (queriesMock.checkoutBranch as jest.Mock).mockRejectedValue(checkoutBranchMutationResponse);

    renderCreateBranchDialog();

    const textfield = screen.getByLabelText(
      textMock('branching.new_branch_dialog.branch_name_label'),
    );
    const createButton = screen.getByRole('button', {
      name: textMock('branching.new_branch_dialog.create'),
    });

    await user.type(textfield, 'new-branch');
    await user.click(createButton);

    const uncommittedChangesHeading = await screen.findByRole('heading', {
      name: textMock('branching.uncommitted_changes_dialog.heading'),
    });
    expect(uncommittedChangesHeading).toBeInTheDocument();
  });
});

const defaultProps: CreateBranchDialogProps = {
  isOpen: true,
  onClose,
  org,
  app,
};

const renderCreateBranchDialog = (props?: Partial<CreateBranchDialogProps>) => {
  return render(
    <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
      <CreateBranchDialog {...defaultProps} {...props} />
    </ServicesContextProvider>,
  );
};

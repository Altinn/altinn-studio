import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CreateBranchDialogProps } from './CreateBranchDialog';
import { CreateBranchDialog } from './CreateBranchDialog';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const onClose = jest.fn();
const setBranchName = jest.fn();
const handleCreate = jest.fn();

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
    const dialog = getDialog();
    expect(dialog).toBeInTheDocument();
  });

  it('should render heading', () => {
    renderCreateBranchDialog();
    const heading = getHeading();
    expect(heading).toBeInTheDocument();
  });

  it('should render buttons', () => {
    renderCreateBranchDialog();

    const cancelButton = getCancelButton();
    const createButton = getCreateButton();

    expect(cancelButton).toBeInTheDocument();
    expect(createButton).toBeInTheDocument();
  });

  it('should call onClose when pressing cancel button', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog();

    const cancelButton = getCancelButton();
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should display error when error prop is provided', () => {
    renderCreateBranchDialog({
      error: textMock('branching.new_branch_dialog.error_invalid_chars'),
    });
    const errorMessage = screen.getByText(
      textMock('branching.new_branch_dialog.error_invalid_chars'),
    );
    expect(errorMessage).toBeInTheDocument();
  });

  it('should call handleCreate when pressing create button', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog();

    const createButton = getCreateButton();
    await user.click(createButton);

    expect(handleCreate).toHaveBeenCalledTimes(1);
  });

  it('should call setBranchName when typing in textfield', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog();

    const textfield = getBranchNameTextfield();
    await user.type(textfield, 'new-branch');

    expect(setBranchName).toHaveBeenCalled();
  });

  it('should change button text when isCreatingOrCheckingOut is true', () => {
    renderCreateBranchDialog({
      isCreatingOrCheckingOut: true,
    });
    const createButton = getCreatingButton();
    expect(createButton).toBeInTheDocument();
  });

  it('should disable create button when isCreatingOrCheckingOut is true', () => {
    renderCreateBranchDialog({
      isCreatingOrCheckingOut: true,
    });
    const createButton = getCreatingButton();
    expect(createButton).toBeDisabled();
  });
});

const defaultProps: CreateBranchDialogProps = {
  isOpen: true,
  onClose,
  currentBranch: 'master',
  branchName: '',
  setBranchName,
  error: null,
  isCreatingOrCheckingOut: false,
  handleCreate,
};

const renderCreateBranchDialog = (props?: Partial<CreateBranchDialogProps>) => {
  return render(
    <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
      <CreateBranchDialog {...defaultProps} {...props} />
    </ServicesContextProvider>,
  );
};

const getDialog = () => screen.getByRole('dialog');

const getHeading = () =>
  screen.getByRole('heading', { name: textMock('branching.new_branch_dialog.create') });

const getCancelButton = () => screen.getByRole('button', { name: textMock('general.cancel') });

const getCreateButton = () =>
  screen.getByRole('button', { name: textMock('branching.new_branch_dialog.create') });

const getCreatingButton = () =>
  screen.getByRole('button', { name: textMock('branching.new_branch_dialog.creating') });

const getBranchNameTextfield = () =>
  screen.getByLabelText(textMock('branching.new_branch_dialog.branch_name_label'));

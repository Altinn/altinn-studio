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
const onCreateBranch = jest.fn();

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

  it('should render dialog content', () => {
    renderCreateBranchDialog();
    const heading = getHeading();
    const cancelButton = getCancelButton();
    const createButton = queryCreateButton();
    expect(heading).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
    expect(createButton).toBeInTheDocument();
  });

  it('should call onCreateBranch with branch name when pressing create button', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog();

    const textField = getBranchNameTextfield();
    const createButton = queryCreateButton();
    const newBranchName = 'branch-name';
    await user.type(textField, newBranchName);
    await user.click(createButton);

    expect(onCreateBranch).toHaveBeenCalledTimes(1);
    expect(onCreateBranch).toHaveBeenCalledWith(newBranchName);
  });

  it('should call onClose when pressing cancel button', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog();

    const cancelButton = getCancelButton();
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should display error when createError prop is provided', () => {
    const createError = textMock('branching.new_branch_dialog.error_generic');
    renderCreateBranchDialog({
      createError,
    });
    const errorMessage = screen.getByText(createError);
    expect(errorMessage).toBeInTheDocument();
  });

  it('should display error when pressing create button with invalid name', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog();

    const textField = getBranchNameTextfield();
    const createButton = queryCreateButton();
    await user.type(textField, 'name with spaces');
    await user.click(createButton);

    const errorMessage = screen.getByText(
      textMock('branching.new_branch_dialog.error_invalid_chars'),
    );
    expect(errorMessage).toBeInTheDocument();
    expect(onCreateBranch).not.toHaveBeenCalled();
  });

  it('should alter create button text when isLoading is true', () => {
    renderCreateBranchDialog({
      isLoading: true,
    });
    const loadingButton = getLoadingCreateButton();
    const createButton = queryCreateButton();
    expect(loadingButton).toBeInTheDocument();
    expect(loadingButton).toBeDisabled();
    expect(createButton).not.toBeInTheDocument();
  });
});

const defaultProps: CreateBranchDialogProps = {
  isOpen: true,
  onClose,
  currentBranch: 'master',
  createError: null,
  isLoading: false,
  onCreateBranch,
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

const queryCreateButton = () =>
  screen.queryByRole('button', { name: textMock('branching.new_branch_dialog.create') });

const getLoadingCreateButton = () =>
  screen.getByRole('button', { name: textMock('general.loading') });

const getBranchNameTextfield = () =>
  screen.getByLabelText(textMock('branching.new_branch_dialog.branch_name_label'));

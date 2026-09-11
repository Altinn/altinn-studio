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

  it('should display a validation error in real time as the user types an invalid name', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog();

    await user.type(getBranchNameTextfield(), 'name with spaces');

    const errorMessage = screen.getByText(
      textMock('branching.new_branch_dialog.error_invalid_chars'),
    );
    expect(errorMessage).toBeInTheDocument();
  });

  it('should disable the create button while the branch name is empty', () => {
    renderCreateBranchDialog();
    expect(queryCreateButton()).toBeDisabled();
  });

  it('should display an error when the branch name already exists', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog({ existingBranchNames: ['existing-branch'] });

    await user.type(getBranchNameTextfield(), 'existing-branch');

    const errorMessage = screen.getByText(
      textMock('branching.new_branch_dialog.error_already_exists'),
    );
    expect(errorMessage).toBeInTheDocument();
    expect(queryCreateButton()).toBeDisabled();
  });

  it('should disable the create button while the branch name is invalid', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog();

    await user.type(getBranchNameTextfield(), 'name with spaces');

    expect(queryCreateButton()).toBeDisabled();
  });

  it('should clear the validation error once the name becomes valid again', async () => {
    const user = userEvent.setup();
    renderCreateBranchDialog();

    const textField = getBranchNameTextfield();
    await user.type(textField, 'name with spaces');
    expect(
      screen.getByText(textMock('branching.new_branch_dialog.error_invalid_chars')),
    ).toBeInTheDocument();

    await user.clear(textField);
    await user.type(textField, 'valid-branch-name');

    expect(
      screen.queryByText(textMock('branching.new_branch_dialog.error_invalid_chars')),
    ).not.toBeInTheDocument();
    expect(queryCreateButton()).not.toBeDisabled();
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
  existingBranchNames: [],
  createError: '',
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

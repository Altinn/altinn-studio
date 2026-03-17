import React from 'react';
import { screen } from '@testing-library/react';
import { BranchDropdown } from './BranchDropdown';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../mocks/renderWithProviders';
import userEvent from '@testing-library/user-event';
import {
  branchesMock,
  currentBranchInfoMock,
  uncommittedChangesErrorMock,
} from '../../test/mocks/branchingMocks';
import { useBranchData } from '../../hooks/useBranchData/useBranchData';
import { useBranchOperations } from '../../hooks/useBranchOperations/useBranchOperations';
import { useMediaQuery } from '@studio/hooks';

jest.mock('../../hooks/useBranchData/useBranchData');
jest.mock('../../hooks/useBranchOperations/useBranchOperations');
jest.mock('@studio/hooks/src/hooks/useMediaQuery');

const mockUseBranchData = jest.mocked(useBranchData);
const mockUseBranchOperations = jest.mocked(useBranchOperations);

const checkoutExistingBranch = jest.fn();
const checkoutNewBranch = jest.fn();
const discardChangesAndCheckout = jest.fn();
const clearUncommittedChangesError = jest.fn();

const mockBranchData = (overrides = {}) => {
  mockUseBranchData.mockReturnValue({
    currentBranch: currentBranchInfoMock.branchName,
    branchList: branchesMock,
    isLoading: false,
    ...overrides,
  });
};

const mockBranchOperations = (overrides = {}) => {
  mockUseBranchOperations.mockReturnValue({
    checkoutExistingBranch,
    checkoutNewBranch,
    discardChangesAndCheckout,
    clearUncommittedChangesError,
    isLoading: false,
    uncommittedChangesError: null,
    createError: '',
    ...overrides,
  });
};

describe('BranchDropdown', () => {
  beforeEach(() => {
    mockBranchData();
    mockBranchOperations();
  });

  afterEach(jest.clearAllMocks);

  it('Should show loading spinner when loading branch data', () => {
    mockBranchData({ isLoading: true });

    renderBranchDropdown();
    const loadingSpinner = getLoadingSpinner();
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('Should show loading spinner when performing branch operations', () => {
    mockBranchOperations({ isLoading: true });

    renderBranchDropdown();
    const loadingSpinner = getLoadingSpinner();
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('should render dropdown trigger with text on a large screen', () => {
    renderBranchDropdown();

    const dropdownTrigger = getDropdownTrigger();
    expect(dropdownTrigger).toHaveTextContent(currentBranchInfoMock.branchName);
  });

  it('should not render the button text on a small screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    renderBranchDropdown();

    const dropdownTrigger = getDropdownTrigger();
    expect(dropdownTrigger).not.toHaveTextContent(currentBranchInfoMock.branchName);
  });

  it('Should list branches and disable current branch', async () => {
    const user = userEvent.setup();
    renderBranchDropdown();
    const dropdownTrigger = getDropdownTrigger();
    await user.click(dropdownTrigger);

    const masterBranchButton = getMasterBranchButton();
    const featureBranchButton = getFeatureBranchButton();

    expect(masterBranchButton).toBeInTheDocument();
    expect(masterBranchButton).toBeDisabled();
    expect(featureBranchButton).toBeInTheDocument();
    expect(featureBranchButton).not.toBeDisabled();
  });

  it('Should call checkoutExistingBranch when clicking on a branch', async () => {
    const user = userEvent.setup();
    renderBranchDropdown();
    await user.click(getDropdownTrigger());
    await user.click(getFeatureBranchButton());

    expect(checkoutExistingBranch).toHaveBeenCalledWith('feature-branch');
  });

  it('Should open and close CreateBranchDialog', async () => {
    const user = userEvent.setup();
    renderBranchDropdown();
    const dropdownTrigger = getDropdownTrigger();
    await user.click(dropdownTrigger);

    const newBranchDialogTrigger = getNewBranchDialogTrigger();
    await user.click(newBranchDialogTrigger);

    const createBranchDialog = screen.getByRole('dialog');
    expect(createBranchDialog).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(closeButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Should call checkoutNewBranch when creating a new branch', async () => {
    const user = userEvent.setup();
    renderBranchDropdown();
    const dropdownTrigger = getDropdownTrigger();
    await user.click(dropdownTrigger);

    const newBranchDialogTrigger = getNewBranchDialogTrigger();
    await user.click(newBranchDialogTrigger);

    const branchNameInput = screen.getByLabelText(
      textMock('branching.new_branch_dialog.branch_name_label'),
    );
    await user.type(branchNameInput, 'new-feature');

    const createButton = screen.getByRole('button', {
      name: textMock('branching.new_branch_dialog.create'),
    });
    await user.click(createButton);

    expect(checkoutNewBranch).toHaveBeenCalledWith('new-feature');
  });

  it('Should display UncommittedChangesDialog when uncommitted changes error exists', () => {
    mockBranchOperations({ uncommittedChangesError: uncommittedChangesErrorMock });
    renderBranchDropdown();

    const uncommittedChangesDialog = screen.getByRole('dialog');
    expect(uncommittedChangesDialog).toBeInTheDocument();
  });

  it('Should call discardChangesAndCheckout when clicking discard button', async () => {
    const user = userEvent.setup();
    mockBranchOperations({ uncommittedChangesError: uncommittedChangesErrorMock });
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    renderBranchDropdown();

    const discardButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
    });
    await user.click(discardButton);

    expect(discardChangesAndCheckout).toHaveBeenCalled();
  });

  it('Should call clearUncommittedChangesError when closing dialog', async () => {
    const user = userEvent.setup();
    mockBranchOperations({ uncommittedChangesError: uncommittedChangesErrorMock });

    renderBranchDropdown();

    const cancelButton = screen.getByRole('button', {
      name: textMock('branching.uncommitted_changes_dialog.cancel'),
    });
    await user.click(cancelButton);

    expect(clearUncommittedChangesError).toHaveBeenCalled();
  });
});

const renderBranchDropdown = () => {
  return renderWithProviders()(<BranchDropdown />);
};

const getLoadingSpinner = () => {
  return screen.getByTestId('studio-spinner-test-id');
};

const getDropdownTrigger = () => {
  return screen.getByRole('button', { name: textMock('branching.select_branch') });
};

const getNewBranchDialogTrigger = () => {
  return screen.getByRole('button', { name: textMock('branching.new_branch_dialog.trigger') });
};

const getMasterBranchButton = () => {
  const masterButtons = screen.getAllByRole('button', { name: 'master' });
  const masterButtonInDropdown = masterButtons.at(-1);
  return masterButtonInDropdown;
};

const getFeatureBranchButton = () => {
  return screen.getByRole('button', { name: 'feature-branch' });
};

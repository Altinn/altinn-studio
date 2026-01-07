import React from 'react';
import { screen } from '@testing-library/react';
import { BranchDropdown } from './BranchDropdown';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../mocks/renderWithProviders';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { QueryClient } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import {
  branchesMock,
  currentBranchInfoMock,
  uncommittedChangesErrorMock,
} from '../../test/mocks/branchingMocks';
import { useCheckoutBranchAndReload } from '../../hooks/useCheckoutBranchAndReload';
import { useCreateAndCheckoutBranch } from '../../hooks/useCreateAndCheckoutBranch';
import { useDiscardChangesMutation } from 'app-shared/hooks/mutations/useDiscardChangesMutation';

jest.mock('../../hooks/useCheckoutBranchAndReload');
jest.mock('../../hooks/useCreateAndCheckoutBranch');
jest.mock('app-shared/hooks/mutations/useDiscardChangesMutation');

const mockUseCheckoutBranchAndReload = jest.mocked(useCheckoutBranchAndReload);
const mockUseCreateAndCheckoutBranch = jest.mocked(useCreateAndCheckoutBranch);
const mockUseDiscardChangesMutation = jest.mocked(useDiscardChangesMutation);

const checkoutMutate = jest.fn();
const createAndCheckoutBranch = jest.fn();
const discardChangesMutate = jest.fn();

describe('BranchDropdown', () => {
  beforeEach(() => {
    mockUseCheckoutBranchAndReload.mockReturnValue({
      mutate: checkoutMutate,
      isPending: false,
    } as any);
    mockUseCreateAndCheckoutBranch.mockReturnValue({
      createAndCheckoutBranch,
      isLoading: false,
      createError: null,
    });
    mockUseDiscardChangesMutation.mockReturnValue({
      mutate: discardChangesMutate,
      isPending: false,
    } as any);
  });

  afterEach(jest.clearAllMocks);

  it('Should display the branch dropdown button', async () => {
    renderBranchDropdownWithData();
    const dropdownTrigger = getDropdownTrigger();
    expect(dropdownTrigger).toBeInTheDocument();
  });

  it('Should show loading spinner when fetching current branch info', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.Branches, org, app], branchesMock);

    renderBranchDropdown(queryClient);
    const loadingSpinner = getLoadingSpinner();
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('Should show loading spinner when fetching list of branches', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentBranch, org, app], currentBranchInfoMock);

    renderBranchDropdown(queryClient);
    const loadingSpinner = getLoadingSpinner();
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('Should show loading spinner when checking out branch', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentBranch, org, app], currentBranchInfoMock);
    queryClient.setQueryData([QueryKey.Branches, org, app], branchesMock);

    mockUseCheckoutBranchAndReload.mockReturnValue({
      mutate: checkoutMutate,
      isPending: true,
    } as any);

    renderBranchDropdown(queryClient);
    const loadingSpinner = getLoadingSpinner();
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('Should show loading spinner when creating new branch', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentBranch, org, app], currentBranchInfoMock);
    queryClient.setQueryData([QueryKey.Branches, org, app], branchesMock);

    mockUseCreateAndCheckoutBranch.mockReturnValue({
      createAndCheckoutBranch,
      isLoading: true,
      uncommittedChangesError: null,
      createError: null,
    });

    renderBranchDropdown(queryClient);
    const loadingSpinner = getLoadingSpinner();
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('Should show loading spinner when discarding uncommitted changes', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentBranch, org, app], currentBranchInfoMock);
    queryClient.setQueryData([QueryKey.Branches, org, app], branchesMock);

    mockUseDiscardChangesMutation.mockReturnValue({
      mutate: discardChangesMutate,
      isPending: true,
    } as any);

    renderBranchDropdown(queryClient);
    const loadingSpinner = getLoadingSpinner();
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('Should list available branches in dropdown', async () => {
    const user = userEvent.setup();
    renderBranchDropdownWithData();
    const dropdownTrigger = getDropdownTrigger();

    await user.click(dropdownTrigger);

    const masterBranchButton = getMasterBranchButton();
    const featureBranchButton = getFeatureBranchButton();

    expect(masterBranchButton).toBeInTheDocument();
    expect(featureBranchButton).toBeInTheDocument();
  });

  it('Should handle empty branch list', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.CurrentBranch, org, app], currentBranchInfoMock);
    queryClient.setQueryData([QueryKey.Branches, org, app], []);

    renderBranchDropdown(queryClient);
    const dropdownTrigger = getDropdownTrigger();

    await user.click(dropdownTrigger);

    const newBranchDialogTrigger = getNewBranchDialogTrigger();
    expect(newBranchDialogTrigger).toBeInTheDocument();
  });

  it('Should disable current branch in dropdown', async () => {
    const user = userEvent.setup();
    renderBranchDropdownWithData();
    const dropdownTrigger = getDropdownTrigger();

    await user.click(dropdownTrigger);

    const masterBranchButton = getMasterBranchButton();
    const featureBranchButton = getFeatureBranchButton();

    expect(masterBranchButton).toBeDisabled();
    expect(featureBranchButton).not.toBeDisabled();
  });

  it('Should call checkoutBranchAndReload when clicking on a branch', async () => {
    const user = userEvent.setup();
    renderBranchDropdownWithData();
    const dropdownTrigger = getDropdownTrigger();

    await user.click(dropdownTrigger);

    const featureBranchButton = getFeatureBranchButton();
    await user.click(featureBranchButton);

    expect(checkoutMutate).toHaveBeenCalledWith('feature-branch');
  });

  describe('CreateBranchDialog', () => {
    it('Should display CreateBranchDialog when clicking new branch button', async () => {
      const user = userEvent.setup();
      renderBranchDropdownWithData();
      const dropdownTrigger = getDropdownTrigger();

      await user.click(dropdownTrigger);

      const newBranchDialogTrigger = getNewBranchDialogTrigger();
      await user.click(newBranchDialogTrigger);

      const createBranchDialog = screen.getByRole('dialog');
      expect(createBranchDialog).toBeInTheDocument();
    });

    it('Should set showCreateDialog to false when closing CreateBranchDialog', async () => {
      const user = userEvent.setup();
      renderBranchDropdownWithData();
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

    it('Should call createAndCheckoutBranch when creating a new branch', async () => {
      const user = userEvent.setup();
      renderBranchDropdownWithData();
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

      expect(createAndCheckoutBranch).toHaveBeenCalledWith('new-feature');
    });
  });

  describe('UncommittedChangesDialog', () => {
    it('Should display UncommittedChangesDialog when checkout triggers uncommitted changes error', async () => {
      const user = userEvent.setup();
      let capturedCallback: ((error: any) => void) | undefined;

      mockUseCheckoutBranchAndReload.mockImplementation((org, app, options) => {
        capturedCallback = options?.onUncommittedChanges;
        return {
          mutate: jest.fn(() => {
            capturedCallback?.(uncommittedChangesErrorMock);
          }),
          isPending: false,
        } as any;
      });

      renderBranchDropdownWithData();

      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger);

      const featureBranchButton = getFeatureBranchButton();
      await user.click(featureBranchButton);

      const uncommittedChangesDialog = screen.getByRole('dialog');
      expect(uncommittedChangesDialog).toBeInTheDocument();
    });

    it('Should display UncommittedChangesDialog when create and checkout triggers uncommitted changes error', async () => {
      const user = userEvent.setup();
      let capturedCallback: ((error: any) => void) | undefined;

      mockUseCreateAndCheckoutBranch.mockImplementation((org, app, options) => {
        capturedCallback = options?.onUncommittedChanges;
        return {
          createAndCheckoutBranch: jest.fn(() => {
            capturedCallback?.(uncommittedChangesErrorMock);
          }),
          isLoading: false,
          createError: null,
        };
      });

      renderBranchDropdownWithData();

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

      const uncommittedChangesDialog = screen.getByRole('dialog');
      expect(uncommittedChangesDialog).toBeInTheDocument();
    });

    it('Should not display UncommittedChangesDialog when no uncommitted changes error', () => {
      renderBranchDropdownWithData();

      const uncommittedChangesDialog = screen.queryByRole('dialog');
      expect(uncommittedChangesDialog).not.toBeInTheDocument();
    });

    it('Should call discardChangesMutation when clicking discard button in UncommittedChangesDialog', async () => {
      const user = userEvent.setup();
      let capturedCallback: ((error: any) => void) | undefined;

      mockUseCheckoutBranchAndReload.mockImplementation((org, app, options) => {
        capturedCallback = options?.onUncommittedChanges;
        return {
          mutate: jest.fn(() => {
            capturedCallback?.(uncommittedChangesErrorMock);
          }),
          isPending: false,
        } as any;
      });
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      renderBranchDropdownWithData();

      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger);

      const featureBranchButton = getFeatureBranchButton();
      await user.click(featureBranchButton);

      const uncommittedChangesDialog = screen.getByRole('dialog');
      expect(uncommittedChangesDialog).toBeInTheDocument();

      const discardButton = screen.getByRole('button', {
        name: textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
      });
      await user.click(discardButton);

      expect(discardChangesMutate).toHaveBeenCalled();
    });

    it('Should clear uncommitted changes error when closing UncommittedChangesDialog', async () => {
      const user = userEvent.setup();
      let capturedCallback: ((error: any) => void) | undefined;

      mockUseCheckoutBranchAndReload.mockImplementation((org, app, options) => {
        capturedCallback = options?.onUncommittedChanges;
        return {
          mutate: jest.fn(() => {
            capturedCallback?.(uncommittedChangesErrorMock);
          }),
          isPending: false,
        } as any;
      });

      renderBranchDropdownWithData();

      const dropdownTrigger = getDropdownTrigger();
      await user.click(dropdownTrigger);

      const featureBranchButton = getFeatureBranchButton();
      await user.click(featureBranchButton);

      const uncommittedChangesDialog = screen.getByRole('dialog');
      expect(uncommittedChangesDialog).toBeInTheDocument();

      const closeButton = screen.getByRole('button', {
        name: textMock('branching.uncommitted_changes_dialog.cancel'),
      });
      await user.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

const renderBranchDropdown = (queryClient: QueryClient) => {
  return renderWithProviders({ ...queriesMock }, queryClient)(<BranchDropdown />);
};

const renderBranchDropdownWithData = () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentBranch, org, app], currentBranchInfoMock);
  queryClient.setQueryData([QueryKey.Branches, org, app], branchesMock);
  return renderBranchDropdown(queryClient);
};

const getLoadingSpinner = () => {
  return screen.getByTestId('studio-spinner-test-id');
};

const getDropdownTrigger = () => {
  return screen.getByTitle(textMock('branching.select_branch'));
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

import { act, waitFor } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import type { UseCreateAndCheckoutBranchResult } from './useCreateAndCheckoutBranch';
import { useCreateAndCheckoutBranch } from './useCreateAndCheckoutBranch';
import type { AxiosError } from 'axios';
import type { RepoStatus } from 'app-shared/types/api/BranchTypes';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import {
  mockBranch,
  mockRepoStatus,
  uncommittedChangesErrorMock,
} from '../../test/mocks/branchingMocks';
import { org, app } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';

const branchName = 'feature/new-branch';

describe('useCreateAndCheckoutBranch', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create and checkout branch successfully', async () => {
    const createBranch = jest.fn().mockResolvedValue(mockBranch);
    const checkoutBranch = jest.fn().mockResolvedValue(mockRepoStatus);

    const { result } = renderUseCreateAndCheckoutBranch({ createBranch, checkoutBranch });

    result.current.createAndCheckoutBranch(branchName);

    await waitFor(() => expect(createBranch).toHaveBeenCalledWith(org, app, branchName));
    await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, branchName));
    expect(result.current.createError).toBe('');
  });

  it('should reset errors when retrying after failure', async () => {
    const createBranch = jest
      .fn()
      .mockRejectedValueOnce(createAxiosError(409))
      .mockResolvedValueOnce(mockBranch);
    const checkoutBranch = jest.fn().mockResolvedValue(mockRepoStatus);

    const { result } = renderUseCreateAndCheckoutBranch({ createBranch, checkoutBranch });

    act(() => result.current.createAndCheckoutBranch(branchName));
    await waitFor(() => expect(result.current.createError).not.toBe(''));

    act(() => result.current.createAndCheckoutBranch('another-branch'));
    await waitFor(() => expect(result.current.createError).toBe(''));
  });

  it('should set specific error when branch already exists', async () => {
    const createBranch = jest.fn().mockRejectedValue(createAxiosError(409));

    const { result } = renderUseCreateAndCheckoutBranch({ createBranch });

    result.current.createAndCheckoutBranch(branchName);

    await waitFor(() =>
      expect(result.current.createError).toBe(
        textMock('branching.new_branch_dialog.error_already_exists'),
      ),
    );
  });

  it('should set generic error for other create failures', async () => {
    const createBranch = jest.fn().mockRejectedValue(createAxiosError(500));

    const { result } = renderUseCreateAndCheckoutBranch({ createBranch });

    result.current.createAndCheckoutBranch(branchName);

    await waitFor(() =>
      expect(result.current.createError).toBe(
        textMock('branching.new_branch_dialog.error_generic'),
      ),
    );
  });

  it('should not checkout when create fails', async () => {
    const createBranch = jest.fn().mockRejectedValue(createAxiosError(409));
    const checkoutBranch = jest.fn();

    const { result } = renderUseCreateAndCheckoutBranch({ createBranch, checkoutBranch });

    result.current.createAndCheckoutBranch(branchName);

    await waitFor(() => expect(result.current.createError).not.toBe(''));
    expect(checkoutBranch).not.toHaveBeenCalled();
  });

  it('should call onUncommittedChanges callback when checkout has uncommitted changes error', async () => {
    const createBranch = jest.fn().mockResolvedValue(mockBranch);
    const checkoutBranch = jest
      .fn()
      .mockRejectedValue(createAxiosError(409, uncommittedChangesErrorMock));
    const onUncommittedChanges = jest.fn();

    const { result } = renderUseCreateAndCheckoutBranch(
      { createBranch, checkoutBranch },
      onUncommittedChanges,
    );

    result.current.createAndCheckoutBranch(branchName);

    await waitFor(() =>
      expect(onUncommittedChanges).toHaveBeenCalledWith(uncommittedChangesErrorMock),
    );
    expect(result.current.createError).toBe('');
  });

  it('should handle generic checkout errors', async () => {
    const createBranch = jest.fn().mockResolvedValue(mockBranch);
    const checkoutBranch = jest.fn().mockRejectedValue(createAxiosError(500));

    const { result } = renderUseCreateAndCheckoutBranch({ createBranch, checkoutBranch });

    result.current.createAndCheckoutBranch(branchName);

    await waitFor(() =>
      expect(result.current.createError).toBe(
        textMock('branching.new_branch_dialog.error_generic'),
      ),
    );
  });

  it('should track loading state during mutations', async () => {
    let resolveCheckout: (value: RepoStatus) => void;
    const checkoutPromise = new Promise<RepoStatus>((resolve) => {
      resolveCheckout = resolve;
    });

    const createBranch = jest.fn().mockResolvedValue(mockBranch);
    const checkoutBranch = jest.fn().mockImplementation(() => checkoutPromise);

    const { result } = renderUseCreateAndCheckoutBranch({ createBranch, checkoutBranch });

    expect(result.current.isLoading).toBe(false);

    act(() => result.current.createAndCheckoutBranch(branchName));

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => resolveCheckout(mockRepoStatus));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

const renderUseCreateAndCheckoutBranch = (
  queries: Partial<ServicesContextProps> = {},
  onUncommittedChanges?: (error: any) => void,
): RenderHookResult<UseCreateAndCheckoutBranchResult, void> =>
  renderHookWithProviders(() => useCreateAndCheckoutBranch(org, app, { onUncommittedChanges }), {
    queries,
  });

const createAxiosError = (status: number, data?: unknown): AxiosError => ({
  response: { status, data, statusText: 'Error', headers: {}, config: {} as any },
  isAxiosError: true,
  toJSON: () => ({}),
  name: 'AxiosError',
  message: `Request failed with status code ${status}`,
});

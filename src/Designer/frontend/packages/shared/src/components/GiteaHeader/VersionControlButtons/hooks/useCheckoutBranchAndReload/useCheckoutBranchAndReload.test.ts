import { act, waitFor } from '@testing-library/react';
import { useCheckoutBranchAndReload } from './useCheckoutBranchAndReload';
import type { AxiosError } from 'axios';
import type { RepoStatus } from 'app-shared/types/api/BranchTypes';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { mockRepoStatus, uncommittedChangesErrorMock } from '../../test/mocks/branchingMocks';
import { org, app } from '@studio/testing/testids';

const branchName = 'feature/test-branch';

describe('useCheckoutBranchAndReload', () => {
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

  it('should checkout branch and reload page on success', async () => {
    const checkoutBranch = jest.fn().mockResolvedValue(mockRepoStatus);

    const { result } = renderUseCheckoutBranchAndReload({ checkoutBranch });

    result.current.mutate(branchName);

    await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, branchName));
    await waitFor(() => expect(window.location.reload).toHaveBeenCalled());
  });

  it('should call onUncommittedChanges callback when uncommitted changes error occurs', async () => {
    const checkoutBranch = jest
      .fn()
      .mockRejectedValue(createAxiosError(409, uncommittedChangesErrorMock));
    const onUncommittedChanges = jest.fn();

    const { result } = renderUseCheckoutBranchAndReload({ checkoutBranch }, onUncommittedChanges);

    result.current.mutate(branchName);

    await waitFor(() =>
      expect(onUncommittedChanges).toHaveBeenCalledWith(uncommittedChangesErrorMock),
    );
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('should not reload page when checkout fails with other errors', async () => {
    const checkoutBranch = jest.fn().mockRejectedValue(createAxiosError(500));

    const { result } = renderUseCheckoutBranchAndReload({ checkoutBranch });

    result.current.mutate(branchName);

    await waitFor(() => expect(checkoutBranch).toHaveBeenCalled());
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('should track loading state during checkout', async () => {
    let resolveCheckout: (value: RepoStatus) => void;
    const checkoutPromise = new Promise<RepoStatus>((resolve) => {
      resolveCheckout = resolve;
    });

    const checkoutBranch = jest.fn().mockImplementation(() => checkoutPromise);

    const { result } = renderUseCheckoutBranchAndReload({ checkoutBranch });

    expect(result.current.isPending).toBe(false);

    act(() => result.current.mutate(branchName));

    await waitFor(() => expect(result.current.isPending).toBe(true));

    resolveCheckout(mockRepoStatus);

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});

const renderUseCheckoutBranchAndReload = (
  queries: Partial<ServicesContextProps> = {},
  onUncommittedChanges?: (error: any) => void,
) =>
  renderHookWithProviders(() => useCheckoutBranchAndReload(org, app, { onUncommittedChanges }), {
    queries,
  });

const createAxiosError = (status: number, data?: unknown): AxiosError => ({
  response: { status, data, statusText: 'Error', headers: {}, config: {} as any },
  isAxiosError: true,
  toJSON: () => ({}),
  name: 'AxiosError',
  message: `Request failed with status code ${status}`,
});

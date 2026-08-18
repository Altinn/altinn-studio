import { renderHook, act } from '@testing-library/react';
import { useBranchOperations } from './useBranchOperations';
import { useCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCheckoutBranchMutation';
import { useCreateAndCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCreateAndCheckoutBranchMutation';
import { useDiscardAndCheckoutBranchMutation } from 'app-shared/hooks/mutations/useDiscardAndCheckoutBranchMutation';
import { useDeleteBranchMutation } from 'app-shared/hooks/mutations/useDeleteBranchMutation';
import { uncommittedChangesErrorMock } from '../../test/mocks/branchingMocks';
import { app, org } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('app-shared/hooks/mutations/useCheckoutBranchMutation');
jest.mock('app-shared/hooks/mutations/useCreateAndCheckoutBranchMutation');
jest.mock('app-shared/hooks/mutations/useDiscardAndCheckoutBranchMutation');
jest.mock('app-shared/hooks/mutations/useDeleteBranchMutation');

const mockUseCheckoutBranchMutation = jest.mocked(useCheckoutBranchMutation);
const mockUseCreateAndCheckoutBranchMutation = jest.mocked(useCreateAndCheckoutBranchMutation);
const mockUseDiscardAndCheckoutBranchMutation = jest.mocked(useDiscardAndCheckoutBranchMutation);
const mockUseDeleteBranchMutation = jest.mocked(useDeleteBranchMutation);

const checkoutBranchMutate = jest.fn();
const createAndCheckoutMutate = jest.fn();
const discardAndCheckoutMutate = jest.fn();
const deleteBranchMutate = jest.fn();

const { reload: originalReload } = window.location;

describe('useBranchOperations', () => {
  beforeEach(() => {
    mockUseCheckoutBranchMutation.mockReturnValue({
      mutate: checkoutBranchMutate,
      isPending: false,
    } as any);
    mockUseCreateAndCheckoutBranchMutation.mockReturnValue({
      mutate: createAndCheckoutMutate,
      isPending: false,
    } as any);
    mockUseDiscardAndCheckoutBranchMutation.mockReturnValue({
      mutate: discardAndCheckoutMutate,
      isPending: false,
    } as any);
    mockUseDeleteBranchMutation.mockReturnValue({
      mutate: deleteBranchMutate,
      isPending: false,
    } as any);

    Object.defineProperty(window, 'location', {
      value: { reload: jest.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    window.location.reload = originalReload;
    jest.clearAllMocks();
  });

  describe('checkoutExistingBranch', () => {
    it('should checkout and reload on success', () => {
      checkoutBranchMutate.mockImplementation((_branch, options) => options?.onSuccess?.());

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutExistingBranch('feature-branch'));

      expect(checkoutBranchMutate).toHaveBeenCalledWith('feature-branch', expect.any(Object));
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should set uncommittedChangesError on 409 conflict with data', () => {
      checkoutBranchMutate.mockImplementation((_branch, options) =>
        options?.onError?.(createAxiosError(409, uncommittedChangesErrorMock)),
      );

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutExistingBranch('feature-branch'));

      expect(result.current.uncommittedChangesError).toEqual(uncommittedChangesErrorMock);
      expect(window.location.reload).not.toHaveBeenCalled();
    });

    it('should clear previous uncommittedChangesError', () => {
      checkoutBranchMutate
        .mockImplementationOnce((_branch, options) =>
          options?.onError?.(createAxiosError(409, uncommittedChangesErrorMock)),
        )
        .mockImplementationOnce((_branch, options) => options?.onSuccess?.());

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutExistingBranch('feature-branch'));
      expect(result.current.uncommittedChangesError).toEqual(uncommittedChangesErrorMock);

      act(() => result.current.checkoutExistingBranch('other-branch'));
      expect(result.current.uncommittedChangesError).toBeNull();
    });
  });

  describe('checkoutNewBranch', () => {
    it('should create, checkout, and reload on success', () => {
      createAndCheckoutMutate.mockImplementation((_branch, options) => options?.onSuccess?.());

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutNewBranch('new-feature'));

      expect(createAndCheckoutMutate).toHaveBeenCalledWith('new-feature', expect.any(Object));
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should set generic error when a non-conflict error occurs', () => {
      createAndCheckoutMutate.mockImplementation((_branch, options) =>
        options?.onError?.(createAxiosError(500)),
      );

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutNewBranch('new-branch'));

      expect(result.current.createError).toBe(
        textMock('branching.new_branch_dialog.error_generic'),
      );
      expect(result.current.uncommittedChangesError).toBeNull();
    });

    it('should set uncommittedChangesError when a 409 conflict with data occurs', () => {
      createAndCheckoutMutate.mockImplementation((_branch, options) =>
        options?.onError?.(createAxiosError(409, uncommittedChangesErrorMock)),
      );

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutNewBranch('new-branch'));

      expect(result.current.uncommittedChangesError).toEqual(uncommittedChangesErrorMock);
      expect(result.current.createError).toBe('');
    });

    it('should reset createError when retrying', () => {
      createAndCheckoutMutate
        .mockImplementationOnce((_branch, options) => options?.onError?.(createAxiosError(500)))
        .mockImplementationOnce((_branch, options) => options?.onSuccess?.());

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutNewBranch('existing-branch'));
      expect(result.current.createError).not.toBe('');

      act(() => result.current.checkoutNewBranch('another-branch'));
      expect(result.current.createError).toBe('');
    });
  });

  describe('discardChangesAndCheckout', () => {
    it('should discard, checkout, and reload on success', () => {
      discardAndCheckoutMutate.mockImplementation((_branch, options) => options?.onSuccess?.());

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.discardChangesAndCheckout('target-branch'));

      expect(discardAndCheckoutMutate).toHaveBeenCalledWith('target-branch', expect.any(Object));
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should set uncommittedChangesError when checkout fails with 409', () => {
      discardAndCheckoutMutate.mockImplementation((_branch, options) =>
        options?.onError?.(createAxiosError(409, uncommittedChangesErrorMock)),
      );

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.discardChangesAndCheckout('target-branch'));

      expect(result.current.uncommittedChangesError).toEqual(uncommittedChangesErrorMock);
      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });

  describe('deleteCurrentBranch', () => {
    it('should delete the branch and reload on success', () => {
      deleteBranchMutate.mockImplementation((_branch, options) => options?.onSuccess?.());

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.deleteCurrentBranch('feature-branch'));

      expect(deleteBranchMutate).toHaveBeenCalledWith('feature-branch', expect.any(Object));
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('clearUncommittedChangesError', () => {
    it('should clear the error state', () => {
      checkoutBranchMutate.mockImplementation((_undefined, options) =>
        options?.onError?.(createAxiosError(409, uncommittedChangesErrorMock)),
      );

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutExistingBranch('feature-branch'));
      expect(result.current.uncommittedChangesError).toEqual(uncommittedChangesErrorMock);

      act(() => result.current.clearUncommittedChangesError());
      expect(result.current.uncommittedChangesError).toBeNull();
    });
  });

  describe('isLoading', () => {
    it('should return false when no mutations are pending', () => {
      const { result } = renderHook(() => useBranchOperations(org, app));
      expect(result.current.isLoading).toBe(false);
    });

    it('should return true when any mutation is pending', () => {
      mockUseCreateAndCheckoutBranchMutation.mockReturnValue({
        mutate: createAndCheckoutMutate,
        isPending: true,
      } as any);

      const { result } = renderHook(() => useBranchOperations(org, app));
      expect(result.current.isLoading).toBe(true);
    });
  });
});

const createAxiosError = (status: number, data?: unknown) => ({
  response: { status, data, statusText: 'Error', headers: {}, config: {} as any },
  isAxiosError: true,
  toJSON: () => ({}),
  name: 'AxiosError',
  message: `Request failed with status code ${status}`,
});

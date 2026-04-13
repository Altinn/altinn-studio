import { renderHook, act } from '@testing-library/react';
import { useBranchOperations } from './useBranchOperations';
import { useCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCheckoutBranchMutation';
import { useCreateBranchMutation } from 'app-shared/hooks/mutations/useCreateBranchMutation';
import { useDiscardChangesMutation } from 'app-shared/hooks/mutations/useDiscardChangesMutation';
import { uncommittedChangesErrorMock } from '../../test/mocks/branchingMocks';
import { app, org } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('app-shared/hooks/mutations/useCheckoutBranchMutation');
jest.mock('app-shared/hooks/mutations/useCreateBranchMutation');
jest.mock('app-shared/hooks/mutations/useDiscardChangesMutation');

const mockUseCheckoutBranchMutation = jest.mocked(useCheckoutBranchMutation);
const mockUseCreateBranchMutation = jest.mocked(useCreateBranchMutation);
const mockUseDiscardChangesMutation = jest.mocked(useDiscardChangesMutation);

const checkoutBranchMutate = jest.fn();
const createBranchMutate = jest.fn();
const discardChangesMutate = jest.fn();

const { reload: originalReload } = window.location;

describe('useBranchOperations', () => {
  beforeEach(() => {
    mockUseCheckoutBranchMutation.mockReturnValue({
      mutate: checkoutBranchMutate,
      isPending: false,
    } as any);
    mockUseCreateBranchMutation.mockReturnValue({
      mutate: createBranchMutate,
      isPending: false,
    } as any);
    mockUseDiscardChangesMutation.mockReturnValue({
      mutate: discardChangesMutate,
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
    it('should create branch, checkout, and reload on success', () => {
      createBranchMutate.mockImplementation((_branch, options) => options?.onSuccess?.());
      checkoutBranchMutate.mockImplementation((_branch, options) => options?.onSuccess?.());

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutNewBranch('new-feature'));

      expect(createBranchMutate).toHaveBeenCalledWith('new-feature', expect.any(Object));
      expect(checkoutBranchMutate).toHaveBeenCalledWith('new-feature', expect.any(Object));
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should set "already exists" error when create fails with 409', () => {
      createBranchMutate.mockImplementation((_branch, options) =>
        options?.onError?.(createAxiosError(409)),
      );

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutNewBranch('existing-branch'));

      expect(result.current.createError).toBe(
        textMock('branching.new_branch_dialog.error_already_exists'),
      );
      expect(checkoutBranchMutate).not.toHaveBeenCalled();
    });

    it('should set generic error when create fails with 500', () => {
      createBranchMutate.mockImplementation((_branch, options) =>
        options?.onError?.(createAxiosError(500)),
      );

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutNewBranch('new-branch'));

      expect(result.current.createError).toBe(
        textMock('branching.new_branch_dialog.error_generic'),
      );
    });

    it('should set uncommittedChangesError when checkout after create fails with 409', () => {
      createBranchMutate.mockImplementation((_branch, options) => options?.onSuccess?.());
      checkoutBranchMutate.mockImplementation((_branch, options) =>
        options?.onError?.(createAxiosError(409, uncommittedChangesErrorMock)),
      );

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutNewBranch('new-branch'));

      expect(result.current.uncommittedChangesError).toEqual(uncommittedChangesErrorMock);
      expect(result.current.createError).toBe('');
    });

    it('should reset createError when retrying', () => {
      createBranchMutate
        .mockImplementationOnce((_branch, options) => options?.onError?.(createAxiosError(409)))
        .mockImplementationOnce((_branch, options) => options?.onSuccess?.());
      checkoutBranchMutate.mockImplementation((_branch, options) => options?.onSuccess?.());

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.checkoutNewBranch('existing-branch'));
      expect(result.current.createError).not.toBe('');

      act(() => result.current.checkoutNewBranch('another-branch'));
      expect(result.current.createError).toBe('');
    });
  });

  describe('discardChangesAndCheckout', () => {
    it('should discard changes, checkout, and reload on success', () => {
      discardChangesMutate.mockImplementation((_undefined, options) => options?.onSuccess?.());
      checkoutBranchMutate.mockImplementation((_branch, options) => options?.onSuccess?.());

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.discardChangesAndCheckout('target-branch'));

      expect(discardChangesMutate).toHaveBeenCalledWith(undefined, expect.any(Object));
      expect(checkoutBranchMutate).toHaveBeenCalledWith('target-branch', expect.any(Object));
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should set uncommittedChangesError when checkout fails with 409', () => {
      discardChangesMutate.mockImplementation((_undefined, options) => options?.onSuccess?.());
      checkoutBranchMutate.mockImplementation((_branch, options) =>
        options?.onError?.(createAxiosError(409, uncommittedChangesErrorMock)),
      );

      const { result } = renderHook(() => useBranchOperations(org, app));

      act(() => result.current.discardChangesAndCheckout('target-branch'));

      expect(result.current.uncommittedChangesError).toEqual(uncommittedChangesErrorMock);
      expect(window.location.reload).not.toHaveBeenCalled();
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
      mockUseCreateBranchMutation.mockReturnValue({
        mutate: createBranchMutate,
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

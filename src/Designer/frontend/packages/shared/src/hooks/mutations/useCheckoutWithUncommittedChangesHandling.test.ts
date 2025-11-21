import { act, waitFor } from '@testing-library/react';
import { useCheckoutWithUncommittedChangesHandling } from './useCheckoutWithUncommittedChangesHandling';
import type { AxiosError } from 'axios';
import type { UncommittedChangesError, RepoStatus } from '../../types/api/BranchTypes';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';

describe('useCheckoutWithUncommittedChangesHandling', () => {
  const org = 'test-org';
  const app = 'test-app';
  const mockOnUncommittedChanges = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnOtherError = jest.fn();

  const mockRepoStatus: RepoStatus = {
    repositoryStatus: 'Ok',
    aheadBy: 0,
    behindBy: 0,
    contentStatus: [],
    hasMergeConflict: false,
    currentBranch: 'main',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful checkout', () => {
    it('should call onSuccess when checkout succeeds', async () => {
      const checkoutBranch = jest
        .fn()
        .mockImplementation(() => Promise.resolve<RepoStatus>(mockRepoStatus));

      const { result } = renderHookWithProviders(
        () =>
          useCheckoutWithUncommittedChangesHandling(org, app, {
            onUncommittedChanges: mockOnUncommittedChanges,
            onSuccess: mockOnSuccess,
            onOtherError: mockOnOtherError,
          }),
        {
          queries: { checkoutBranch },
        },
      );

      await act(async () => {
        result.current.mutate('feature/test');
      });

      await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() => expect(mockOnSuccess).toHaveBeenCalledTimes(1));
      expect(mockOnUncommittedChanges).not.toHaveBeenCalled();
      expect(mockOnOtherError).not.toHaveBeenCalled();
    });

    it('should work without optional onSuccess callback', async () => {
      const checkoutBranch = jest
        .fn()
        .mockImplementation(() => Promise.resolve<RepoStatus>(mockRepoStatus));

      const { result } = renderHookWithProviders(
        () =>
          useCheckoutWithUncommittedChangesHandling(org, app, {
            onUncommittedChanges: mockOnUncommittedChanges,
          }),
        {
          queries: { checkoutBranch },
        },
      );

      await act(async () => {
        result.current.mutate('feature/test');
      });

      await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      expect(mockOnUncommittedChanges).not.toHaveBeenCalled();
    });
  });

  describe('uncommitted changes error (409 Conflict)', () => {
    it('should call onUncommittedChanges when checkout fails with 409 and has data', async () => {
      const mockUncommittedChangesError: UncommittedChangesError = {
        error: 'Cannot switch branches',
        message: 'You have uncommitted changes',
        uncommittedFiles: [{ filePath: 'test.txt', status: 'Modified' }],
        currentBranch: 'main',
        targetBranch: 'feature/test',
      };

      const error409: AxiosError<UncommittedChangesError> = {
        response: {
          status: 409,
          data: mockUncommittedChangesError,
          statusText: 'Conflict',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 409',
      };

      const checkoutBranch = jest.fn().mockImplementation(() => Promise.reject(error409));

      const { result } = renderHookWithProviders(
        () =>
          useCheckoutWithUncommittedChangesHandling(org, app, {
            onUncommittedChanges: mockOnUncommittedChanges,
            onSuccess: mockOnSuccess,
            onOtherError: mockOnOtherError,
          }),
        {
          queries: { checkoutBranch },
        },
      );

      await act(async () => {
        result.current.mutate('feature/test');
      });

      await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() =>
        expect(mockOnUncommittedChanges).toHaveBeenCalledWith(mockUncommittedChangesError),
      );
      expect(mockOnUncommittedChanges).toHaveBeenCalledTimes(1);
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnOtherError).not.toHaveBeenCalled();
    });

    it('should call onOtherError when 409 has no data', async () => {
      const error409WithoutData: AxiosError<UncommittedChangesError> = {
        response: {
          status: 409,
          data: undefined as any,
          statusText: 'Conflict',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 409',
      };

      const checkoutBranch = jest
        .fn()
        .mockImplementation(() => Promise.reject(error409WithoutData));

      const { result } = renderHookWithProviders(
        () =>
          useCheckoutWithUncommittedChangesHandling(org, app, {
            onUncommittedChanges: mockOnUncommittedChanges,
            onOtherError: mockOnOtherError,
          }),
        {
          queries: { checkoutBranch },
        },
      );

      await act(async () => {
        result.current.mutate('feature/test');
      });

      await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() => expect(mockOnOtherError).toHaveBeenCalledWith(error409WithoutData));
      expect(mockOnUncommittedChanges).not.toHaveBeenCalled();
    });

    it('should call onOtherError when error has no response', async () => {
      const error409WithoutResponse: AxiosError<UncommittedChangesError> = {
        response: undefined,
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed',
      };

      const checkoutBranch = jest
        .fn()
        .mockImplementation(() => Promise.reject(error409WithoutResponse));

      const { result } = renderHookWithProviders(
        () =>
          useCheckoutWithUncommittedChangesHandling(org, app, {
            onUncommittedChanges: mockOnUncommittedChanges,
            onOtherError: mockOnOtherError,
          }),
        {
          queries: { checkoutBranch },
        },
      );

      await act(async () => {
        result.current.mutate('feature/test');
      });

      await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() => expect(mockOnOtherError).toHaveBeenCalledWith(error409WithoutResponse));
      expect(mockOnUncommittedChanges).not.toHaveBeenCalled();
    });
  });

  describe('other errors', () => {
    it('should call onOtherError for 500 errors', async () => {
      const error500: AxiosError = {
        response: {
          status: 500,
          data: {},
          statusText: 'Internal Server Error',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 500',
      };

      const checkoutBranch = jest.fn().mockImplementation(() => Promise.reject(error500));

      const { result } = renderHookWithProviders(
        () =>
          useCheckoutWithUncommittedChangesHandling(org, app, {
            onUncommittedChanges: mockOnUncommittedChanges,
            onOtherError: mockOnOtherError,
          }),
        {
          queries: { checkoutBranch },
        },
      );

      await act(async () => {
        result.current.mutate('feature/test');
      });

      await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() => expect(mockOnOtherError).toHaveBeenCalledWith(error500));
      expect(mockOnOtherError).toHaveBeenCalledTimes(1);
      expect(mockOnUncommittedChanges).not.toHaveBeenCalled();
    });

    it('should call onOtherError for 404 errors', async () => {
      const error404: AxiosError = {
        response: {
          status: 404,
          data: {},
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 404',
      };

      const checkoutBranch = jest.fn().mockImplementation(() => Promise.reject(error404));

      const { result } = renderHookWithProviders(
        () =>
          useCheckoutWithUncommittedChangesHandling(org, app, {
            onUncommittedChanges: mockOnUncommittedChanges,
            onOtherError: mockOnOtherError,
          }),
        {
          queries: { checkoutBranch },
        },
      );

      await act(async () => {
        result.current.mutate('feature/test');
      });

      await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() => expect(mockOnOtherError).toHaveBeenCalledWith(error404));
      expect(mockOnUncommittedChanges).not.toHaveBeenCalled();
    });

    it('should work without optional onOtherError callback', async () => {
      const error500: AxiosError = {
        response: {
          status: 500,
          data: {},
          statusText: 'Internal Server Error',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 500',
      };

      const checkoutBranch = jest.fn().mockImplementation(() => Promise.reject(error500));

      const { result } = renderHookWithProviders(
        () =>
          useCheckoutWithUncommittedChangesHandling(org, app, {
            onUncommittedChanges: mockOnUncommittedChanges,
          }),
        {
          queries: { checkoutBranch },
        },
      );

      await act(async () => {
        result.current.mutate('feature/test');
      });

      await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      // Should not throw even though onOtherError is not provided
    });
  });

  describe('return value', () => {
    it('should return mutation with correct shape', async () => {
      const checkoutBranch = jest
        .fn()
        .mockImplementation(() => Promise.resolve<RepoStatus>(mockRepoStatus));

      const { result } = renderHookWithProviders(
        () =>
          useCheckoutWithUncommittedChangesHandling(org, app, {
            onUncommittedChanges: mockOnUncommittedChanges,
          }),
        {
          queries: { checkoutBranch },
        },
      );

      expect(result.current).toHaveProperty('mutate');
      expect(result.current).toHaveProperty('mutateAsync');
      expect(result.current).toHaveProperty('isPending');
      expect(typeof result.current.mutate).toBe('function');
    });
  });
});

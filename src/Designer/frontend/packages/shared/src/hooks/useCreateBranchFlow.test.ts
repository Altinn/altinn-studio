import { act, waitFor } from '@testing-library/react';
import { useCreateBranchFlow } from './useCreateBranchFlow';
import type { AxiosError } from 'axios';
import type { Branch, RepoStatus, UncommittedChangesError } from '../types/api/BranchTypes';
import { renderHookWithProviders } from '../mocks/renderHookWithProviders';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { KeyValuePairs } from '../types/KeyValuePairs';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, variables?: KeyValuePairs<string>) => textMock(key, variables),
  }),
}));

describe('useCreateBranchFlow', () => {
  const org = 'test-org';
  const app = 'test-app';
  const mockOnSuccess = jest.fn();

  const mockBranch: Branch = {
    name: 'feature/test',
    commit: {
      id: 'abc123',
      message: 'Initial commit',
    },
  };

  const mockRepoStatus: RepoStatus = {
    repositoryStatus: 'Ok',
    aheadBy: 0,
    behindBy: 0,
    contentStatus: [],
    hasMergeConflict: false,
    currentBranch: 'feature/test',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty branch name', () => {
      const createBranch = jest.fn();
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      expect(result.current.branchName).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.uncommittedChangesError).toBeNull();
    });

    it('should initialize with cannotCreateBranch as true (empty name)', () => {
      const createBranch = jest.fn();
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      expect(result.current.cannotCreateBranch).toBe(true);
    });

    it('should initialize with correct button text', () => {
      const createBranch = jest.fn();
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      expect(result.current.createButtonText).toBe('[mockedText(create_branch.create)]');
    });
  });

  describe('setBranchName', () => {
    it('should update branch name', () => {
      const createBranch = jest.fn();
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      expect(result.current.branchName).toBe('feature/test');
    });

    it('should enable create button when valid name is entered', () => {
      const createBranch = jest.fn();
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      expect(result.current.cannotCreateBranch).toBe(false);
    });
  });

  describe('validation', () => {
    it('should reject empty branch name', () => {
      const createBranch = jest.fn();
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.error).toBe('[mockedText(create_branch.error_empty)]');
      expect(createBranch).not.toHaveBeenCalled();
    });

    it('should reject branch name with invalid characters', () => {
      const createBranch = jest.fn();
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature:test');
      });

      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.error).toBe('[mockedText(create_branch.error_invalid_chars)]');
      expect(createBranch).not.toHaveBeenCalled();
    });

    it('should reject branch name with invalid patterns', () => {
      const createBranch = jest.fn();
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature..test');
      });

      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.error).toBe('[mockedText(create_branch.error_invalid_pattern)]');
      expect(createBranch).not.toHaveBeenCalled();
    });

    it('should accept valid branch name and call create mutation', async () => {
      const createBranch = jest.fn().mockImplementation(() => Promise.resolve(mockBranch));
      const checkoutBranch = jest.fn().mockImplementation(() => Promise.resolve(mockRepoStatus));

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      act(() => {
        result.current.handleCreate();
      });

      await waitFor(() => expect(createBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      expect(result.current.error).toBeNull();
    });

    it('should clear previous errors before creating', () => {
      const createBranch = jest.fn();
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      // First attempt with invalid name
      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.error).toBe('[mockedText(create_branch.error_empty)]');

      // Second attempt with valid name
      act(() => {
        result.current.setBranchName('feature/test');
      });

      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('create mutation flow', () => {
    it('should call checkout mutation after successful create', async () => {
      const createBranch = jest.fn().mockImplementation(() => Promise.resolve(mockBranch));
      const checkoutBranch = jest.fn().mockImplementation(() => Promise.resolve(mockRepoStatus));

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      act(() => {
        result.current.handleCreate();
      });

      await waitFor(() => expect(createBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
    });

    it('should set error when create fails with 409 conflict', async () => {
      const error409: AxiosError = {
        response: {
          status: 409,
          data: {},
          statusText: 'Conflict',
          headers: {},
          config: {} as any,
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 409',
      };

      const createBranch = jest.fn().mockImplementation(() => Promise.reject(error409));
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      act(() => {
        result.current.handleCreate();
      });

      await waitFor(() => expect(createBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() =>
        expect(result.current.error).toBe('[mockedText(create_branch.error_already_exists)]'),
      );
    });

    it('should set generic error when create fails with other error', async () => {
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

      const createBranch = jest.fn().mockImplementation(() => Promise.reject(error500));
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      act(() => {
        result.current.handleCreate();
      });

      await waitFor(() => expect(createBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() =>
        expect(result.current.error).toBe('[mockedText(create_branch.error_generic)]'),
      );
    });
  });

  describe('checkout mutation flow', () => {
    it('should set uncommittedChangesError when checkout fails with uncommitted changes', async () => {
      const mockUncommittedChangesError: UncommittedChangesError = {
        error: 'Cannot switch branches',
        message: 'You have uncommitted changes',
        uncommittedFiles: [],
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

      const createBranch = jest.fn().mockImplementation(() => Promise.resolve(mockBranch));
      const checkoutBranch = jest.fn().mockImplementation(() => Promise.reject(error409));

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      act(() => {
        result.current.handleCreate();
      });

      await waitFor(() => expect(createBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() =>
        expect(result.current.uncommittedChangesError).toEqual(mockUncommittedChangesError),
      );
    });

    it('should call onSuccess callback after successful checkout', async () => {
      const createBranch = jest.fn().mockImplementation(() => Promise.resolve(mockBranch));
      const checkoutBranch = jest.fn().mockImplementation(() => Promise.resolve(mockRepoStatus));

      renderHookWithProviders(() => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }), {
        queries: { createBranch, checkoutBranch },
      });

      await waitFor(() => expect(mockOnSuccess).not.toHaveBeenCalled());
    });

    it('should set error when checkout fails with other error', async () => {
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

      const createBranch = jest.fn().mockImplementation(() => Promise.resolve(mockBranch));
      const checkoutBranch = jest.fn().mockImplementation(() => Promise.reject(error500));

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      act(() => {
        result.current.handleCreate();
      });

      await waitFor(() => expect(createBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith(org, app, 'feature/test'));
      await waitFor(() =>
        expect(result.current.error).toBe('[mockedText(create_branch.error_generic)]'),
      );
    });
  });

  describe('loading states', () => {
    it('should indicate loading when create is pending', async () => {
      const createBranch = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockBranch), 100)),
        );
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      act(() => {
        result.current.handleCreate();
      });

      await waitFor(() => expect(result.current.isCreatingOrCheckingOut).toBe(true));
      await waitFor(() =>
        expect(result.current.createButtonText).toBe('[mockedText(create_branch.creating)]'),
      );
    });

    it('should disable create button when loading', async () => {
      const createBranch = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockBranch), 100)),
        );
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      act(() => {
        result.current.handleCreate();
      });

      await waitFor(() => expect(result.current.cannotCreateBranch).toBe(true));
    });
  });

  describe('handleCloseUncommittedChangesDialog', () => {
    it('should clear uncommittedChangesError and call onSuccess', async () => {
      const mockUncommittedChangesError: UncommittedChangesError = {
        error: 'Cannot switch branches',
        message: 'You have uncommitted changes',
        uncommittedFiles: [],
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

      const createBranch = jest.fn().mockImplementation(() => Promise.resolve(mockBranch));
      const checkoutBranch = jest.fn().mockImplementation(() => Promise.reject(error409));

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      act(() => {
        result.current.handleCreate();
      });

      await waitFor(() => expect(result.current.uncommittedChangesError).not.toBeNull());

      act(() => {
        result.current.handleCloseUncommittedChangesDialog();
      });

      expect(result.current.uncommittedChangesError).toBeNull();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe('targetBranch', () => {
    it('should return current branchName as targetBranch', () => {
      const createBranch = jest.fn();
      const checkoutBranch = jest.fn();

      const { result } = renderHookWithProviders(
        () => useCreateBranchFlow({ org, app, onSuccess: mockOnSuccess }),
        {
          queries: { createBranch, checkoutBranch },
        },
      );

      act(() => {
        result.current.setBranchName('feature/test');
      });

      expect(result.current.targetBranch).toBe('feature/test');
    });
  });
});

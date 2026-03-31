import { renderHook, act } from '@testing-library/react';
import { useBranchOperations } from './useBranchOperations';
import { useCreateAndCheckoutBranch } from '../useCreateAndCheckoutBranch';
import { useCheckoutWithUncommittedChangesHandling } from 'app-shared/hooks/mutations/useCheckoutWithUncommittedChangesHandling';
import { useDiscardChangesMutation } from 'app-shared/hooks/mutations/useDiscardChangesMutation';
import { uncommittedChangesErrorMock } from '../../test/mocks/branchingMocks';
import { app, org } from '@studio/testing/testids';

jest.mock('../useCreateAndCheckoutBranch');
jest.mock('app-shared/hooks/mutations/useCheckoutWithUncommittedChangesHandling');
jest.mock('app-shared/hooks/mutations/useDiscardChangesMutation');

const mockUseCreateAndCheckoutBranch = jest.mocked(useCreateAndCheckoutBranch);
const mockUseCheckoutWithUncommittedChangesHandling = jest.mocked(
  useCheckoutWithUncommittedChangesHandling,
);
const mockUseDiscardChangesMutation = jest.mocked(useDiscardChangesMutation);

const createAndCheckoutBranch = jest.fn();
const checkoutMutate = jest.fn();
const discardChangesMutate = jest.fn();

describe('useBranchOperations', () => {
  beforeEach(() => {
    mockUseCreateAndCheckoutBranch.mockReturnValue({
      createAndCheckoutBranch,
      isLoading: false,
      createError: null,
    });
    mockUseCheckoutWithUncommittedChangesHandling.mockReturnValue({
      mutate: checkoutMutate,
      isPending: false,
    } as any);
    mockUseDiscardChangesMutation.mockReturnValue({
      mutate: discardChangesMutate,
      isPending: false,
    } as any);
  });

  afterEach(jest.clearAllMocks);

  it('checkoutExistingBranch should call checkoutMutation with branch name', () => {
    const { result } = renderHook(() => useBranchOperations(org, app));

    result.current.checkoutExistingBranch('feature-branch');

    expect(checkoutMutate).toHaveBeenCalledWith('feature-branch');
  });

  it('checkoutNewBranch should call createAndCheckoutBranch with branch name', () => {
    const { result } = renderHook(() => useBranchOperations(org, app));

    result.current.checkoutNewBranch('new-feature');

    expect(createAndCheckoutBranch).toHaveBeenCalledWith('new-feature');
  });

  it('discardChangesAndCheckout should call discardChangesMutation and then checkoutMutation on success', () => {
    const mockDiscardMutate = jest.fn((_, options) => options?.onSuccess?.());

    mockUseDiscardChangesMutation.mockReturnValue({
      mutate: mockDiscardMutate,
      isPending: false,
    } as any);

    const { result } = renderHook(() => useBranchOperations(org, app));

    result.current.discardChangesAndCheckout('target-branch');

    expect(mockDiscardMutate).toHaveBeenCalledWith(undefined, expect.any(Object));
    expect(checkoutMutate).toHaveBeenCalledWith('target-branch');
  });

  it('Should handle uncommitted changes errors and allow clearing them', () => {
    mockUseCheckoutWithUncommittedChangesHandling.mockImplementation((_org, _app, options) => {
      return {
        mutate: jest.fn(() => {
          options?.onUncommittedChanges?.(uncommittedChangesErrorMock);
        }),
        isPending: false,
      } as any;
    });

    const { result } = renderHook(() => useBranchOperations(org, app));

    expect(result.current.uncommittedChangesError).toBeNull();

    act(() => {
      result.current.checkoutExistingBranch('feature-branch');
    });

    expect(result.current.uncommittedChangesError).toEqual(uncommittedChangesErrorMock);

    act(() => {
      result.current.clearUncommittedChangesError();
    });

    expect(result.current.uncommittedChangesError).toBeNull();
  });

  it('Should set uncommitted changes error when create and checkout triggers it', () => {
    mockUseCreateAndCheckoutBranch.mockImplementation((_org, _app, options) => {
      return {
        createAndCheckoutBranch: jest.fn(() => {
          options?.onUncommittedChanges?.(uncommittedChangesErrorMock);
        }),
        isLoading: false,
        createError: null,
      };
    });

    const { result } = renderHook(() => useBranchOperations(org, app));

    act(() => {
      result.current.checkoutNewBranch('new-feature');
    });

    expect(result.current.uncommittedChangesError).toEqual(uncommittedChangesErrorMock);
  });

  it('Should clear uncommitted changes error on successful discard', () => {
    mockUseCreateAndCheckoutBranch.mockImplementation((_org, _app, options) => ({
      createAndCheckoutBranch: jest.fn(() => {
        options?.onUncommittedChanges?.(uncommittedChangesErrorMock);
      }),
      isLoading: false,
      createError: null,
    }));

    const mockDiscardMutate = jest.fn((_, options) => options?.onSuccess?.());
    mockUseDiscardChangesMutation.mockReturnValue({
      mutate: mockDiscardMutate,
      isPending: false,
    } as any);

    const { result } = renderHook(() => useBranchOperations(org, app));

    act(() => {
      result.current.checkoutNewBranch('feature-branch');
    });
    expect(result.current.uncommittedChangesError).toEqual(uncommittedChangesErrorMock);

    act(() => {
      result.current.discardChangesAndCheckout('target-branch');
    });
    expect(result.current.uncommittedChangesError).toBeNull();
  });

  it('Should return create error from useCreateAndCheckoutBranch', () => {
    mockUseCreateAndCheckoutBranch.mockReturnValue({
      createAndCheckoutBranch,
      isLoading: false,
      createError: 'Branch already exists',
    });

    const { result } = renderHook(() => useBranchOperations(org, app));

    expect(result.current.createError).toBe('Branch already exists');
  });

  it('Should return correct loading state', () => {
    const { result, rerender } = renderHook(() => useBranchOperations(org, app));

    expect(result.current.isLoading).toBe(false);

    mockUseCreateAndCheckoutBranch.mockReturnValue({
      createAndCheckoutBranch,
      isLoading: true,
      createError: null,
    });

    rerender();
    expect(result.current.isLoading).toBe(true);
  });
});

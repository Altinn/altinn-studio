import { renderHook } from '@testing-library/react';
import { useBranchData } from './useBranchData';
import { useBranchesQuery } from 'app-shared/hooks/queries/useBranchesQuery';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { branchesMock, currentBranchInfoMock } from '../../test/mocks/branchingMocks';
import { app, org } from '@studio/testing/testids';

jest.mock('app-shared/hooks/queries/useBranchesQuery');
jest.mock('app-shared/hooks/queries/useCurrentBranchQuery');

const mockUseBranchesQuery = jest.mocked(useBranchesQuery);
const mockUseCurrentBranchQuery = jest.mocked(useCurrentBranchQuery);

describe('useBranchData', () => {
  afterEach(jest.clearAllMocks);

  it('Should return current branch name and branch list when data is loaded', () => {
    mockUseCurrentBranchQuery.mockReturnValue({
      data: currentBranchInfoMock,
      isLoading: false,
    } as any);
    mockUseBranchesQuery.mockReturnValue({
      data: branchesMock,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useBranchData(org, app));

    expect(result.current.currentBranch).toBe('master');
    expect(result.current.branchList).toEqual(branchesMock);
    expect(result.current.isLoading).toBe(false);
  });

  it('Should return undefined current branch when current branch info is not loaded', () => {
    mockUseCurrentBranchQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);
    mockUseBranchesQuery.mockReturnValue({
      data: branchesMock,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useBranchData(org, app));

    expect(result.current.currentBranch).toBeUndefined();
    expect(result.current.branchList).toEqual(branchesMock);
    expect(result.current.isLoading).toBe(false);
  });

  it('Should return undefined branch list when branches are not loaded', () => {
    mockUseCurrentBranchQuery.mockReturnValue({
      data: currentBranchInfoMock,
      isLoading: false,
    } as any);
    mockUseBranchesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useBranchData(org, app));

    expect(result.current.currentBranch).toBe('master');
    expect(result.current.branchList).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('Should return isLoading true when current branch query is loading', () => {
    mockUseCurrentBranchQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);
    mockUseBranchesQuery.mockReturnValue({
      data: branchesMock,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => useBranchData(org, app));

    expect(result.current.isLoading).toBe(true);
  });

  it('Should return isLoading true when branches query is loading', () => {
    mockUseCurrentBranchQuery.mockReturnValue({
      data: currentBranchInfoMock,
      isLoading: false,
    } as any);
    mockUseBranchesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { result } = renderHook(() => useBranchData(org, app));

    expect(result.current.isLoading).toBe(true);
  });

  it('Should return isLoading true when both queries are loading', () => {
    mockUseCurrentBranchQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);
    mockUseBranchesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { result } = renderHook(() => useBranchData(org, app));

    expect(result.current.isLoading).toBe(true);
  });

  it('Should call queries with correct org and app parameters', () => {
    mockUseCurrentBranchQuery.mockReturnValue({
      data: currentBranchInfoMock,
      isLoading: false,
    } as any);
    mockUseBranchesQuery.mockReturnValue({
      data: branchesMock,
      isLoading: false,
    } as any);

    renderHook(() => useBranchData(org, app));

    expect(mockUseCurrentBranchQuery).toHaveBeenCalledWith(org, app);
    expect(mockUseBranchesQuery).toHaveBeenCalledWith(org, app);
  });
});

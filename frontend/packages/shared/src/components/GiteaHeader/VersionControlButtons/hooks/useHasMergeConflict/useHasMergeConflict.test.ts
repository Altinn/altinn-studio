import { renderHook, act } from '@testing-library/react';
import { useHasMergeConflict } from './useHasMergeConflict';
import { type RepoStatus } from 'app-shared/types/RepoStatus';
import { mockRepoStatus } from '../../test/mocks/versionControlContextMock';

describe('useHasMergeConflict', () => {
  afterEach(jest.clearAllMocks);

  it('should set hasMergeConflict to true when repoStatus.hasMergeConflict is true', () => {
    const { result } = renderHook(() =>
      useHasMergeConflict({ ...mockRepoStatus, hasMergeConflict: true }),
    );
    expect(result.current.hasMergeConflict).toBe(true);
  });

  it('should set hasMergeConflict to false when repoStatus.hasMergeConflict is false', () => {
    const { result } = renderHook(() => useHasMergeConflict(mockRepoStatus));
    expect(result.current.hasMergeConflict).toBe(false);
  });

  it('should update hasMergeConflict when repoStatus changes', () => {
    let repoStatus: RepoStatus = mockRepoStatus;
    const { result, rerender } = renderHook(() => useHasMergeConflict(repoStatus));

    expect(result.current.hasMergeConflict).toBe(false);

    repoStatus = { ...repoStatus, hasMergeConflict: true };
    rerender();

    expect(result.current.hasMergeConflict).toBe(true);
  });

  it('should allow manually setting hasMergeConflict', () => {
    const { result } = renderHook(() => useHasMergeConflict(mockRepoStatus));

    expect(result.current.hasMergeConflict).toBe(false);

    act(() => {
      result.current.setHasMergeConflict(true);
    });

    expect(result.current.hasMergeConflict).toBe(true);
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOrgRepoName } from './useOrgRepoName';
import { useSelectedContext } from '../useSelectedContext';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { ORG_LIBRARY_REPO_IDENTIFIER } from '../../constants';

vi.mock('../useSelectedContext');

describe('useOrgRepoName', () => {
  it('should return null when selected context is All', () => {
    (useSelectedContext as Mock).mockReturnValue(SelectedContextType.All);
    const { result } = renderHook(() => useOrgRepoName());
    expect(result.current).toBeNull();
  });

  it('should return null when selected context is Self', () => {
    (useSelectedContext as Mock).mockReturnValue(SelectedContextType.Self);
    const { result } = renderHook(() => useOrgRepoName());
    expect(result.current).toBeNull();
  });

  it('should return org repo name when selected context is not All or Self', () => {
    const mockContext = 'OrgContext';
    (useSelectedContext as Mock).mockReturnValue(mockContext);
    const { result } = renderHook(() => useOrgRepoName());
    expect(result.current).toBe(`${mockContext}${ORG_LIBRARY_REPO_IDENTIFIER}`);
  });

  it('should handle empty string context', () => {
    (useSelectedContext as Mock).mockReturnValue('');
    const { result } = renderHook(() => useOrgRepoName());
    expect(result.current).toBe(`${ORG_LIBRARY_REPO_IDENTIFIER}`);
  });
});

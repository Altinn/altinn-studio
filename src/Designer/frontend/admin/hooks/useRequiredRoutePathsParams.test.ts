import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRequiredRoutePathsParams } from './useRequiredRoutePathsParams';
import { useRequiredParams } from 'app-shared/hooks/useRequiredParams';

vi.mock('app-shared/hooks/useRequiredParams', () => ({
  useRequiredParams: vi.fn(),
}));

describe('useRequiredRoutePathsParams', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('forwards required params and returns shared hook result', () => {
    const sharedResult = { owner: 'ttd', app: 'my-app' };
    (useRequiredParams as Mock).mockReturnValue(sharedResult);

    const { result } = renderHook(() => useRequiredRoutePathsParams(['owner', 'app']));

    expect(useRequiredParams).toHaveBeenCalledWith(['owner', 'app']);
    expect(result.current).toEqual(sharedResult);
  });
});

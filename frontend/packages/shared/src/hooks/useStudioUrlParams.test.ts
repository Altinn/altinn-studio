import { app, org } from '@studio/testing/testids';
import { renderHook } from '@testing-library/react';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

describe('useStudioUrlParams', () => {
  it('Returns the org and app names from the URL', () => {
    const { result } = renderHook(() => useStudioUrlParams());
    expect(result.current).toEqual({ org, app });
  });
});

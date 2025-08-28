import { app, org } from '@studio/testing/testids';
import { renderHook } from '@testing-library/react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

describe('useStudioEnvironmentParams', () => {
  it('Returns the org and app names from the URL', () => {
    const { result } = renderHook(() => useStudioEnvironmentParams());
    expect(result.current).toEqual({ org, app });
  });
});

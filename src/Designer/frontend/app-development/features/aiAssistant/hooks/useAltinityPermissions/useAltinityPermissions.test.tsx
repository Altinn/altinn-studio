import React from 'react';
import { renderHook } from '@testing-library/react';
import { useAltinityPermissions } from './useAltinityPermissions';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';

describe('useAltinityPermissions', () => {
  it('should return true when user is member of ttd', () => {
    const { result } = renderUseAltinityPermissions('/ttd/test-app');
    expect(result.current).toBe(true);
  });

  it('should return false when user is member of other organization', () => {
    const { result } = renderUseAltinityPermissions('/other-org/test-app');
    expect(result.current).toBe(false);
  });
});

const renderUseAltinityPermissions = (initialPath?: string) =>
  renderHook(() => useAltinityPermissions(), {
    wrapper: ({ children }) => <TestAppRouter initialPath={initialPath}>{children}</TestAppRouter>,
  });

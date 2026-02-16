import React from 'react';
import { renderHook } from '@testing-library/react';
import { ALLOWED_ORGANIZATIONS, useAltinityPermissions } from './useAltinityPermissions';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';

describe('useAltinityPermissions', () => {
  it('should return true when user is member of any allowed organization', () => {
    ALLOWED_ORGANIZATIONS.forEach((org) => {
      const { result } = renderUseAltinityPermissions(`/${org}/test-app`);
      expect(result.current).toBe(true);
    });
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

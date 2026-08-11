import { renderHook } from '@testing-library/react';
import { ALLOWED_ORGANIZATIONS, useAssistantPermissions } from './useAssistantPermissions';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';

describe('useAssistantPermissions', () => {
  it('should return true when user is member of any allowed organization', () => {
    ALLOWED_ORGANIZATIONS.forEach((org) => {
      const { result } = renderUseAssistantPermissions(`/${org}/test-app`);
      expect(result.current).toBe(true);
    });
  });

  it('should return false when user is member of other organization', () => {
    const { result } = renderUseAssistantPermissions('/other-org/test-app');
    expect(result.current).toBe(false);
  });
});

const renderUseAssistantPermissions = (initialPath?: string) =>
  renderHook(() => useAssistantPermissions(), {
    wrapper: ({ children }) => <TestAppRouter initialPath={initialPath}>{children}</TestAppRouter>,
  });

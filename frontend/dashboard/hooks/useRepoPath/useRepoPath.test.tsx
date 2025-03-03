import React from 'react';
import { useRepoPath } from './useRepoPath';
import { HeaderContext, type HeaderContextType } from 'dashboard/context/HeaderContext';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { headerContextValueMock } from 'dashboard/testing/headerContextMock';
import { repositoryOwnerPath, repositoryBasePath } from 'app-shared/api/paths';
import { mockOrg1, mockOrganizations } from 'dashboard/testing/organizationMock';
import { userMock } from 'dashboard/testing/userMock';
import { renderHookWithProviders } from 'dashboard/testing/mocks';

jest.mock('dashboard/hooks/useSelectedContext');

const renderUseRepoPathHook = (headerContextValueProps: Partial<HeaderContextType> = {}) => {
  return renderHookWithProviders(() => useRepoPath(userMock, mockOrganizations), {
    externalWrapper: (children) => (
      <HeaderContext.Provider value={{ ...headerContextValueMock, ...headerContextValueProps }}>
        {children}
      </HeaderContext.Provider>
    ),
  });
};

describe('useRepoPath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the repository owner path when an organization is selected', () => {
    (useSelectedContext as jest.Mock).mockReturnValue(mockOrg1.username);

    const { result } = renderUseRepoPathHook();

    expect(result.current).toBe(repositoryOwnerPath(mockOrg1.username));
  });

  it('should return the user login as the owner path when no organization is selected', () => {
    (useSelectedContext as jest.Mock).mockReturnValue(null);

    const { result } = renderUseRepoPathHook();

    expect(result.current).toBe(repositoryOwnerPath(userMock.login));
  });

  it('should return the repository base path if neither organization nor user is available', () => {
    (useSelectedContext as jest.Mock).mockReturnValue(null);

    const { result } = renderUseRepoPathHook({
      user: { ...userMock, login: '' },
    });

    expect(result.current).toBe(repositoryBasePath());
  });
});

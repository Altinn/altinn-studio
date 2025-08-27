import React from 'react';
import { useRepoPath } from './useRepoPath';
import { HeaderContext, type HeaderContextProps } from '../../context/HeaderContext';
import { useSelectedContext } from '../useSelectedContext';
import { headerContextValueMock } from '../../testing/headerContextMock';
import { repositoryOwnerPath, repositoryBasePath } from 'app-shared/api/paths';
import { mockOrg1, mockOrganizations } from '../../testing/organizationMock';
import { userMock } from '../../testing/userMock';
import { renderHookWithProviders } from '../../testing/mocks';
import type { User } from 'app-shared/types/Repository';

jest.mock('../useSelectedContext');

type Props = {
  headerContextValueProps: Partial<HeaderContextProps>;
  user: User;
};
const renderUseRepoPathHook = (props: Partial<Props> = {}) => {
  const { headerContextValueProps, user = userMock } = props;
  return renderHookWithProviders(() => useRepoPath(user, mockOrganizations), {
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

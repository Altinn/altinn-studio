import React from 'react';
import { useProfileMenuTriggerButtonText } from './useProfileMenuTriggerButtonText';
import { HeaderContext, type HeaderContextType } from 'resourceadm/context/HeaderContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useUrlParams } from '../useUrlParams';
import { type User } from 'app-shared/types/Repository';
import { type Organization } from 'app-shared/types/Organization';
import { renderHook } from '@testing-library/react';

jest.mock('../useUrlParams');

const userMock: User = {
  id: 1,
  avatar_url: '',
  email: 'tester@tester.test',
  full_name: 'Tester Testersen',
  login: 'tester',
  userType: 0,
};
const mockOrg1: Organization = {
  avatar_url: '',
  id: 12,
  username: 'ttd',
  full_name: 'Test',
};
const mockOrg2: Organization = {
  avatar_url: '',
  id: 23,
  username: 'unit-test-2',
  full_name: 'unit-test-2',
};
const mockOrganizations: Organization[] = [mockOrg1, mockOrg2];

const headerContextValueMock: HeaderContextType = {
  user: userMock,
  selectableOrgs: mockOrganizations,
};

const renderUseProfileMenuTriggerButtonTextHook = (
  headerContextValueProps: Partial<HeaderContextType> = {},
) => {
  return renderHook(useProfileMenuTriggerButtonText, {
    wrapper: ({ children }) => (
      <HeaderContext.Provider value={{ ...headerContextValueMock, ...headerContextValueProps }}>
        {children}
      </HeaderContext.Provider>
    ),
  });
};

describe('useProfileMenuTriggerButtonText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the full name and organization name if available', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      org: mockOrg1,
    });
    const { result } = renderUseProfileMenuTriggerButtonTextHook();

    expect(result.current).toBe(
      textMock('shared.header_user_for_org', { user: userMock.full_name }),
    );
  });

  it('should return the login when full name is not available', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      org: mockOrg1,
    });

    const { result } = renderUseProfileMenuTriggerButtonTextHook({
      user: { ...userMock, full_name: '' },
      selectableOrgs: [mockOrg1],
    });

    expect(result.current).toBe(textMock('shared.header_user_for_org', { user: userMock.login }));
  });
});

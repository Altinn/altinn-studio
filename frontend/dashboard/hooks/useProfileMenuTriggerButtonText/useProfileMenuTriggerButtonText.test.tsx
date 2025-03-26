import React from 'react';
import { useProfileMenuTriggerButtonText } from './useProfileMenuTriggerButtonText';
import { HeaderContext, type HeaderContextProps } from '../../context/HeaderContext';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { useSelectedContext } from '../useSelectedContext';
import { userMock } from '../../testing/userMock';
import { headerContextValueMock } from '../../testing/headerContextMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockOrg1 } from '../../testing/organizationMock';
import { renderHookWithProviders } from '../../testing/mocks';

jest.mock('../useSelectedContext');

const renderUseProfileMenuTriggerButtonTextHook = (
  headerContextValueProps: Partial<HeaderContextProps> = {},
) => {
  return renderHookWithProviders(useProfileMenuTriggerButtonText, {
    externalWrapper: (children) => (
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

  it('should return the full name of the user when selected context is Self', () => {
    (useSelectedContext as jest.Mock).mockReturnValue(SelectedContextType.Self);

    const { result } = renderUseProfileMenuTriggerButtonTextHook();

    expect(result.current).toBe(userMock.full_name);
  });

  it('should return the login name of the user when full_name is not available', () => {
    (useSelectedContext as jest.Mock).mockReturnValue(SelectedContextType.Self);

    const { result } = renderUseProfileMenuTriggerButtonTextHook({
      user: { ...userMock, full_name: '' },
    });

    expect(result.current).toBe(userMock.login);
  });

  it('should return the organization and username when selected context is an organization', () => {
    (useSelectedContext as jest.Mock).mockReturnValue(mockOrg1.username);
    const { result } = renderUseProfileMenuTriggerButtonTextHook();

    expect(result.current).toBe(
      textMock('shared.header_user_for_org', { user: userMock.full_name, org: mockOrg1.full_name }),
    );
  });

  it('should return the username when selected context is All', () => {
    (useSelectedContext as jest.Mock).mockReturnValue(SelectedContextType.All);

    const { result } = renderUseProfileMenuTriggerButtonTextHook();

    expect(result.current).toBe(userMock.full_name);
  });
});

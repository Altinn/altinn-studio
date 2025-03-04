import React from 'react';
import { usePageHeaderTitle } from './usePageHeaderTitle';
import { HeaderContext, type HeaderContextType } from 'dashboard/context/HeaderContext';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { headerContextValueMock } from 'dashboard/testing/headerContextMock';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { mockOrg1 } from 'dashboard/testing/organizationMock';
import { renderHookWithProviders } from 'dashboard/testing/mocks';

jest.mock('dashboard/hooks/useSelectedContext');

const renderUsePageHeaderTitleHook = (headerContextValueProps: Partial<HeaderContextType> = {}) => {
  return renderHookWithProviders(usePageHeaderTitle, {
    externalWrapper: (children) => (
      <HeaderContext.Provider value={{ ...headerContextValueMock, ...headerContextValueProps }}>
        {children}
      </HeaderContext.Provider>
    ),
  });
};

describe('usePageHeaderTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the organization name when a valid context is selected', () => {
    (useSelectedContext as jest.Mock).mockReturnValue(mockOrg1.username);

    const { result } = renderUsePageHeaderTitleHook();

    expect(result.current).toBe(mockOrg1.full_name);
  });

  it('should return an empty string when selected context is All', () => {
    (useSelectedContext as jest.Mock).mockReturnValue(SelectedContextType.All);

    const { result } = renderUsePageHeaderTitleHook();

    expect(result.current).toBe('');
  });

  it('should return an empty string when selected context is Self', () => {
    (useSelectedContext as jest.Mock).mockReturnValue(SelectedContextType.Self);

    const { result } = renderUsePageHeaderTitleHook();

    expect(result.current).toBe('');
  });
});

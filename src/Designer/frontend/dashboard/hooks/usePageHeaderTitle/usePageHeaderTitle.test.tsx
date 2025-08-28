import React from 'react';
import { usePageHeaderTitle } from './usePageHeaderTitle';
import { HeaderContext, type HeaderContextProps } from '../../context/HeaderContext';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { headerContextValueMock } from '../../testing/headerContextMock';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { mockOrg1 } from '../../testing/organizationMock';
import { renderHookWithProviders } from '../../testing/mocks';

jest.mock('../../hooks/useSelectedContext');

const renderUsePageHeaderTitleHook = (
  headerContextValueProps: Partial<HeaderContextProps> = {},
) => {
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

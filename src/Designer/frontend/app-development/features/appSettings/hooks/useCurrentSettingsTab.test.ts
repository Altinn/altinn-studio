import { renderHook, act } from '@testing-library/react';
import { useCurrentSettingsTab } from './useCurrentSettingsTab';
import type { SettingsPageTabId } from '../../../types/SettingsPageTabId';
import { useSearchParams } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  useSearchParams: jest.fn(),
}));

const mockUseSearchParams = useSearchParams as jest.Mock;
const validTabs: SettingsPageTabId[] = ['about', 'setup', 'policy'];

describe('useCurrentSettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current tab from search params if valid', () => {
    const mockGet = jest.fn().mockReturnValue('setup');
    const mockSetSearchParams = jest.fn();

    mockUseSearchParams.mockReturnValue([
      { get: mockGet } as unknown as URLSearchParams,
      mockSetSearchParams,
    ]);

    const { result } = renderHook(() => useCurrentSettingsTab(validTabs));

    expect(result.current.tabToDisplay).toBe('setup');
  });

  it('falls back to default tab if currentTab is missing', () => {
    const mockGet = jest.fn().mockReturnValue(null);
    const mockSetSearchParams = jest.fn();

    mockUseSearchParams.mockReturnValue([
      { get: mockGet } as unknown as URLSearchParams,
      mockSetSearchParams,
    ]);

    const { result } = renderHook(() => useCurrentSettingsTab(validTabs));

    expect(result.current.tabToDisplay).toBe('about');
  });

  it('falls back to default tab if currentTab is invalid', () => {
    const mockGet = jest.fn().mockReturnValue('invalid');
    const mockSetSearchParams = jest.fn();

    mockUseSearchParams.mockReturnValue([
      { get: mockGet } as unknown as URLSearchParams,
      mockSetSearchParams,
    ]);

    const { result } = renderHook(() => useCurrentSettingsTab(validTabs));

    expect(result.current.tabToDisplay).toBe('about');
  });

  it('calls setSearchParams with valid tab', () => {
    const mockGet = jest.fn().mockReturnValue('about');
    const mockSetSearchParams = jest.fn();

    const fakeParams = new URLSearchParams('currentTab=about');
    mockUseSearchParams.mockReturnValue([
      {
        get: mockGet,
        toString: fakeParams.toString.bind(fakeParams),
        set: fakeParams.set.bind(fakeParams),
      } as unknown as URLSearchParams,
      mockSetSearchParams,
    ]);

    const { result } = renderHook(() => useCurrentSettingsTab(validTabs));

    act(() => {
      result.current.setTabToDisplay('setup');
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams));
    expect(mockSetSearchParams.mock.calls[0][0].get('currentTab')).toBe('setup');
  });

  it('sets default tab if setTabToDisplay is called with invalid tab', () => {
    const mockGet = jest.fn().mockReturnValue('about');
    const mockSetSearchParams = jest.fn();

    const fakeParams = new URLSearchParams('currentTab=about');
    mockUseSearchParams.mockReturnValue([
      {
        get: mockGet,
        toString: fakeParams.toString.bind(fakeParams),
        set: fakeParams.set.bind(fakeParams),
      } as unknown as URLSearchParams,
      mockSetSearchParams,
    ]);

    const { result } = renderHook(() => useCurrentSettingsTab(validTabs));

    act(() => {
      result.current.setTabToDisplay('not_valid' as SettingsPageTabId);
    });

    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams));
    expect(mockSetSearchParams.mock.calls[0][0].get('currentTab')).toBe('about');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCurrentSettingsTab } from './useCurrentSettingsTab';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { useSearchParams } from 'react-router-dom';

vi.mock('react-router-dom', () => ({
  useSearchParams: vi.fn(),
}));

const mockUseSearchParams = useSearchParams as Mock;
const validTabs: SettingsPageTabId[] = ['about', 'setup', 'policy'];

describe('useCurrentSettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current tab from search params if valid', () => {
    const mockGet = vi.fn().mockReturnValue('setup');
    const mockSetSearchParams = vi.fn();

    mockUseSearchParams.mockReturnValue([
      { get: mockGet } as unknown as URLSearchParams,
      mockSetSearchParams,
    ]);

    const { result } = renderHook(() => useCurrentSettingsTab(validTabs));

    expect(result.current.tabToDisplay).toBe('setup');
  });

  it('falls back to default tab if currentTab is missing', () => {
    const mockGet = vi.fn().mockReturnValue(null);
    const mockSetSearchParams = vi.fn();

    mockUseSearchParams.mockReturnValue([
      { get: mockGet } as unknown as URLSearchParams,
      mockSetSearchParams,
    ]);

    const { result } = renderHook(() => useCurrentSettingsTab(validTabs));

    expect(result.current.tabToDisplay).toBe('about');
  });

  it('falls back to default tab if currentTab is invalid', () => {
    const mockGet = vi.fn().mockReturnValue('invalid');
    const mockSetSearchParams = vi.fn();

    mockUseSearchParams.mockReturnValue([
      { get: mockGet } as unknown as URLSearchParams,
      mockSetSearchParams,
    ]);

    const { result } = renderHook(() => useCurrentSettingsTab(validTabs));

    expect(result.current.tabToDisplay).toBe('about');
  });

  it('calls setSearchParams with valid tab', () => {
    const mockGet = vi.fn().mockReturnValue('about');
    const mockSetSearchParams = vi.fn();

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
    const mockGet = vi.fn().mockReturnValue('about');
    const mockSetSearchParams = vi.fn();

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

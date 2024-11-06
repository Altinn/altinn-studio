import { renderHookWithProviders } from '../test/mocks';
import {
  queryParamKey,
  useOpenSettingsModalBasedQueryParam,
} from './useOpenSettingsModalBasedQueryParam';
import { useSearchParams } from 'react-router-dom';
import { useSettingsModalContext } from '../contexts/SettingsModalContext';
import { waitFor } from '@testing-library/react';

jest.mock('../contexts/SettingsModalContext');
jest.mock('react-router-dom', () => ({
  useSearchParams: jest.fn(),
}));

describe('useOpenSettingsModalBasedQueryParam', () => {
  it('should open dialog if query params has valid tab id', async () => {
    const searchParams = buildSearchParams('about');
    setupSearchParamMock(searchParams);

    const openSettingsMock = jest.fn();
    setupUseSettingsModalContextMock(openSettingsMock);

    renderHookWithProviders()(() => useOpenSettingsModalBasedQueryParam());
    await waitFor(() => expect(openSettingsMock).toHaveBeenCalledWith('about'));
  });

  it('should not open dialog of query params has invalid tab id', async () => {
    const searchParams = buildSearchParams('doestNotExistTab');
    setupSearchParamMock(searchParams);

    const openSettingsMock = jest.fn();
    setupUseSettingsModalContextMock(openSettingsMock);

    renderHookWithProviders()(() => useOpenSettingsModalBasedQueryParam());
    await waitFor(() => expect(openSettingsMock).not.toHaveBeenCalledWith('doestNotExistTab'));
  });
});

function setupSearchParamMock(searchParams: URLSearchParams): jest.Mock {
  return (useSearchParams as jest.Mock).mockReturnValue([searchParams, jest.fn()]);
}

function buildSearchParams(queryParamValue: string): URLSearchParams {
  const searchParams: URLSearchParams = new URLSearchParams();
  searchParams.set(queryParamKey, queryParamValue);
  return searchParams;
}

function setupUseSettingsModalContextMock(openSettingsMock: typeof jest.fn): jest.Mock {
  return (useSettingsModalContext as jest.Mock).mockReturnValue({
    settingsRef: {
      current: {
        openSettings: openSettingsMock,
      },
    },
  });
}

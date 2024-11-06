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
<<<<<<< HEAD
  it('should open "settingsModal" if query params has valid tab id', async () => {
=======
  it('should open dialog if query params has valid tab id', async () => {
>>>>>>> 41381f181 (feat(settings): make it possible to open settings modal based on query-params)
    const searchParams = buildSearchParams('about');
    setupSearchParamMock(searchParams);

    const openSettingsMock = jest.fn();
    setupUseSettingsModalContextMock(openSettingsMock);

    renderHookWithProviders()(() => useOpenSettingsModalBasedQueryParam());
    await waitFor(() => expect(openSettingsMock).toHaveBeenCalledWith('about'));
<<<<<<< HEAD
    expect(openSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('should not open "settingsModal" if query params has an invalid tab id', async () => {
=======
  });

  it('should not open dialog of query params has invalid tab id', async () => {
>>>>>>> 41381f181 (feat(settings): make it possible to open settings modal based on query-params)
    const searchParams = buildSearchParams('doestNotExistTab');
    setupSearchParamMock(searchParams);

    const openSettingsMock = jest.fn();
    setupUseSettingsModalContextMock(openSettingsMock);

    renderHookWithProviders()(() => useOpenSettingsModalBasedQueryParam());
    await waitFor(() => expect(openSettingsMock).not.toHaveBeenCalledWith('doestNotExistTab'));
<<<<<<< HEAD
    expect(openSettingsMock).toHaveBeenCalledTimes(0);
=======
>>>>>>> 41381f181 (feat(settings): make it possible to open settings modal based on query-params)
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

<<<<<<< HEAD
function setupUseSettingsModalContextMock(openSettingsMock: typeof jest.fn): jest.Mock {
=======
function setupUseSettingsModalContextMock(openSettingsMock: jest.fn): jest.Mock {
>>>>>>> 41381f181 (feat(settings): make it possible to open settings modal based on query-params)
  return (useSettingsModalContext as jest.Mock).mockReturnValue({
    settingsRef: {
      current: {
        openSettings: openSettingsMock,
      },
    },
  });
}

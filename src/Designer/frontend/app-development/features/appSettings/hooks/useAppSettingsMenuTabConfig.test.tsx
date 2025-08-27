import { renderHook } from '@testing-library/react';
import { useAppSettingsMenuTabConfigs } from './useAppSettingsMenuTabConfigs';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useAppSettingsMenuTabConfigs', () => {
  it('returns correct tab configurations with translated names and icons', () => {
    const { result } = renderHook(() => useAppSettingsMenuTabConfigs());

    expect(result.current).toHaveLength(5);

    expect(result.current).toEqual([
      {
        tabId: 'about',
        tabName: textMock('app_settings.left_nav_tab_about'),
        icon: expect.any(Object),
      },
      {
        tabId: 'setup',
        tabName: textMock('app_settings.left_nav_tab_setup'),
        icon: expect.any(Object),
      },
      {
        tabId: 'policy',
        tabName: textMock('app_settings.left_nav_tab_policy'),
        icon: expect.any(Object),
      },
      {
        tabId: 'access_control',
        tabName: textMock('app_settings.left_nav_tab_access_control'),
        icon: expect.any(Object),
      },
      {
        tabId: 'maskinporten',
        tabName: textMock('app_settings.left_nav_tab_maskinporten'),
        icon: expect.any(Object),
      },
    ]);
  });
});

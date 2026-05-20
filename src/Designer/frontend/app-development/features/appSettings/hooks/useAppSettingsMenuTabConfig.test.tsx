import { waitFor } from '@testing-library/react';
import { useAppSettingsMenuTabConfigs } from './useAppSettingsMenuTabConfigs';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import type { OrgList } from 'app-shared/types/OrgList';

const orgListWithTestOrg: OrgList = {
  orgs: {
    testOrg: {
      name: { nb: 'Testdepartementet' },
      logo: '',
      orgnr: '123456789',
      homepage: '',
      environments: [],
    },
  },
};

describe('useAppSettingsMenuTabConfigs', () => {
  it('returns correct tab configurations with translated names and icons for service owner apps', async () => {
    const getOrgList = jest.fn().mockImplementation(() => Promise.resolve(orgListWithTestOrg));
    const { renderHookResult } = renderHookWithProviders({ getOrgList })(() =>
      useAppSettingsMenuTabConfigs(),
    );

    await waitFor(() => expect(renderHookResult.result.current).toHaveLength(6));

    expect(renderHookResult.result.current).toEqual([
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
        tabId: 'run',
        tabName: textMock('app_settings.left_nav_tab_run'),
        icon: expect.any(Object),
      },
      {
        tabId: 'maskinporten',
        tabName: textMock('app_settings.left_nav_tab_maskinporten'),
        icon: expect.any(Object),
      },
    ]);
  });

  it('hides the Maskinporten tab for personal apps', async () => {
    const getOrgList = jest.fn().mockImplementation(() => Promise.resolve<OrgList>({ orgs: {} }));
    const { renderHookResult } = renderHookWithProviders({ getOrgList })(() =>
      useAppSettingsMenuTabConfigs(),
    );

    await waitFor(() => expect(getOrgList).toHaveBeenCalledTimes(1));

    expect(renderHookResult.result.current).toHaveLength(5);
    expect(renderHookResult.result.current).not.toContainEqual(
      expect.objectContaining({ tabId: 'maskinporten' }),
    );
  });
});

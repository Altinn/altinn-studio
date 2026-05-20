import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import {
  InformationSquareIcon,
  SidebarBothIcon,
  ShieldLockIcon,
  TimerStartIcon,
  MaskinportenIcon,
  PlayFillIcon,
} from '@studio/icons';
import { useTranslation } from 'react-i18next';
import type { StudioContentMenuButtonTabProps } from '@studio/components';
import { useOrgListQuery } from 'app-development/hooks/queries/useOrgListQuery';
import { isServiceOwnerOrg } from 'app-development/utils/serviceOwnerOrgUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

const aboutTabId: SettingsPageTabId = 'about';
const setupTabId: SettingsPageTabId = 'setup';
const policyTabId: SettingsPageTabId = 'policy';
const accessControlTabId: SettingsPageTabId = 'access_control';
const maskinportenTabId: SettingsPageTabId = 'maskinporten';
const runTabId: SettingsPageTabId = 'run';

export const useAppSettingsMenuTabConfigs =
  (): StudioContentMenuButtonTabProps<SettingsPageTabId>[] => {
    const { t } = useTranslation();
    const { org } = useStudioEnvironmentParams();
    const { data: orgs = {} } = useOrgListQuery();
    const shouldShowMaskinportenTab = isServiceOwnerOrg(orgs, org);

    const tabs: StudioContentMenuButtonTabProps<SettingsPageTabId>[] = [
      {
        tabId: aboutTabId,
        tabName: t(`app_settings.left_nav_tab_${aboutTabId}`),
        icon: <InformationSquareIcon />,
      },
      {
        tabId: setupTabId,
        tabName: t(`app_settings.left_nav_tab_${setupTabId}`),
        icon: <SidebarBothIcon />,
      },
      {
        tabId: policyTabId,
        tabName: t(`app_settings.left_nav_tab_${policyTabId}`),
        icon: <ShieldLockIcon />,
      },
      {
        tabId: accessControlTabId,
        tabName: t(`app_settings.left_nav_tab_${accessControlTabId}`),
        icon: <TimerStartIcon />,
      },
      {
        tabId: runTabId,
        tabName: t(`app_settings.left_nav_tab_${runTabId}`),
        icon: <PlayFillIcon />,
      },
      {
        tabId: maskinportenTabId,
        tabName: t(`app_settings.left_nav_tab_${maskinportenTabId}`),
        icon: <MaskinportenIcon />,
      },
    ];

    return shouldShowMaskinportenTab ? tabs : tabs.filter((tab) => tab.tabId !== maskinportenTabId);
  };

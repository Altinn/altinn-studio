import React from 'react';
import type { SettingsPageTabId } from '../../../types/SettingsPageTabId';
import {
  InformationSquareIcon,
  SidebarBothIcon,
  ShieldLockIcon,
  TimerStartIcon,
  MaskinportenIcon,
} from 'libs/studio-icons/src';
import { useTranslation } from 'react-i18next';
import type { StudioContentMenuButtonTabProps } from 'libs/studio-components/src';

const aboutTabId: SettingsPageTabId = 'about';
const setupTabId: SettingsPageTabId = 'setup';
const policyTabId: SettingsPageTabId = 'policy';
const accessControlTabId: SettingsPageTabId = 'access_control';
const maskinportenTabId: SettingsPageTabId = 'maskinporten';

export const useAppSettingsMenuTabConfigs =
  (): StudioContentMenuButtonTabProps<SettingsPageTabId>[] => {
    const { t } = useTranslation();

    return [
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
        tabId: maskinportenTabId,
        tabName: t(`app_settings.left_nav_tab_${maskinportenTabId}`),
        icon: <MaskinportenIcon />,
      },
    ];
  };

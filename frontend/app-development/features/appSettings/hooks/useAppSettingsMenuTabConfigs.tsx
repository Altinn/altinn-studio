import React from 'react';
import type { SettingsModalTabId } from 'app-development/types/SettingsModalTabId';
import {
  InformationSquareIcon,
  SidebarBothIcon,
  ShieldLockIcon,
  TimerStartIcon,
  MaskinportenIcon,
} from '@studio/icons';
import { useTranslation } from 'react-i18next';
import type { StudioContentMenuButtonTabProps } from '@studio/components';

const aboutTabId: SettingsModalTabId = 'about';
const setupTabId: SettingsModalTabId = 'setup';
const policyTabId: SettingsModalTabId = 'policy';
const accessControlTabId: SettingsModalTabId = 'access_control';
const maskinportenTabId: SettingsModalTabId = 'maskinporten';

export const useAppSettingsMenuTabConfigs =
  (): StudioContentMenuButtonTabProps<SettingsModalTabId>[] => {
    const { t } = useTranslation();

    return [
      {
        tabId: aboutTabId,
        tabName: t(`settings_modal.left_nav_tab_${aboutTabId}`),
        icon: <InformationSquareIcon />,
      },
      {
        tabId: setupTabId,
        tabName: t(`settings_modal.left_nav_tab_${setupTabId}`),
        icon: <SidebarBothIcon />,
      },
      {
        tabId: policyTabId,
        tabName: t(`settings_modal.left_nav_tab_${policyTabId}`),
        icon: <ShieldLockIcon />,
      },
      {
        tabId: accessControlTabId,
        tabName: t(`settings_modal.left_nav_tab_${accessControlTabId}`),
        icon: <TimerStartIcon />,
      },
      {
        tabId: maskinportenTabId,
        tabName: t(`settings_modal.left_nav_tab_${maskinportenTabId}`),
        icon: <MaskinportenIcon />,
      },
    ];
  };

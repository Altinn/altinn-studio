import React from 'react';
import type { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import type { SettingsModalTabId } from '../../../../../../types/SettingsModalTab';
import {
  InformationSquareIcon,
  SidebarBothIcon,
  ShieldLockIcon,
  TimerStartIcon,
} from '@studio/icons';
import { useTranslation } from 'react-i18next';

const aboutTabId: SettingsModalTabId = 'about';
const setupTabId: SettingsModalTabId = 'setup';
const policyTabId: SettingsModalTabId = 'policy';
const accessControlTabId: SettingsModalTabId = 'access_control';

export function getMenuTabConfigs(): LeftNavigationTab[] {
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
  ];
}

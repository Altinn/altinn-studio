import React from 'react';
import type { SettingsModalTabId } from '../../../../../../types/SettingsModalTabId';
import {
  InformationSquareIcon,
  SidebarBothIcon,
  ShieldLockIcon,
  TimerStartIcon,
} from '@studio/icons';
import { useTranslation } from 'react-i18next';
import type { StudioContentMenuButtonTabProps } from '@studio/components';

const aboutTabId: SettingsModalTabId = 'about';
const setupTabId: SettingsModalTabId = 'setup';
const policyTabId: SettingsModalTabId = 'policy';
const accessControlTabId: SettingsModalTabId = 'access_control';

export const useSettingsModalMenuTabConfigs = () => {
  const { t } = useTranslation();

  const getMenuTabConfigs = (): StudioContentMenuButtonTabProps<SettingsModalTabId>[] => {
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
  };

  return { getMenuTabConfigs };
};

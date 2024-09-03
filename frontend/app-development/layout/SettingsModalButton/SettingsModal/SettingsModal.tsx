import type { ReactElement } from 'react';
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import classes from './SettingsModal.module.css';
import {
  CogIcon,
  InformationSquareIcon,
  TimerStartIcon,
  ShieldLockIcon,
  SidebarBothIcon,
} from '@studio/icons';
import { StudioModal } from '@studio/components';
import type { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { LeftNavigationBar } from 'app-shared/components/LeftNavigationBar';
import type { SettingsModalTab } from 'app-development/types/SettingsModalTab';
import { createNavigationTab } from './utils';
import { useTranslation } from 'react-i18next';
import { PolicyTab } from './components/Tabs/PolicyTab';
import { AboutTab } from './components/Tabs/AboutTab';
import { AccessControlTab } from './components/Tabs/AccessControlTab';
import { SetupTab } from './components/Tabs/SetupTab';
import type { SettingsModalHandle } from '../../../types/SettingsModalHandle';

export const SettingsModal = forwardRef<SettingsModalHandle, {}>(({}, ref): ReactElement => {
  const { t } = useTranslation();

  const [currentTab, setCurrentTab] = useState<SettingsModalTab>('about');
  const dialogRef = useRef<HTMLDialogElement>();

  const openSettings = (tab: SettingsModalTab = 'about') => {
    setCurrentTab(tab);
    dialogRef.current?.showModal();
  };

  useImperativeHandle<SettingsModalHandle, SettingsModalHandle>(ref, () => ({ openSettings }), []);

  const aboutTabId: SettingsModalTab = 'about';
  const setupTabId: SettingsModalTab = 'setup';
  const policyTabId: SettingsModalTab = 'policy';
  const accessControlTabId: SettingsModalTab = 'access_control';

  const leftNavigationTabs: LeftNavigationTab[] = [
    createNavigationTab(
      <InformationSquareIcon className={classes.icon} />,
      aboutTabId,
      () => setCurrentTab(aboutTabId),
      currentTab,
    ),
    createNavigationTab(
      <SidebarBothIcon className={classes.icon} />,
      setupTabId,
      () => setCurrentTab(setupTabId),
      currentTab,
    ),
    createNavigationTab(
      <ShieldLockIcon className={classes.icon} />,
      policyTabId,
      () => setCurrentTab(policyTabId),
      currentTab,
    ),
    createNavigationTab(
      <TimerStartIcon className={classes.icon} />,
      accessControlTabId,
      () => setCurrentTab(accessControlTabId),
      currentTab,
    ),
  ];

  const displayTabs = () => {
    switch (currentTab) {
      case 'about': {
        return <AboutTab />;
      }
      case 'setup': {
        return <SetupTab />;
      }
      case 'policy': {
        return <PolicyTab />;
      }
      case 'access_control': {
        return <AccessControlTab />;
      }
    }
  };

  return (
    <StudioModal.Dialog
      className={classes.settingsModal}
      closeButtonTitle={t('settings_modal.close_button_label')}
      contentPadding={false}
      heading={t('settings_modal.heading')}
      icon={<CogIcon />}
      ref={dialogRef}
      contentClassName={classes.modalContent}
    >
      <div className={classes.leftNavWrapper}>
        <LeftNavigationBar tabs={leftNavigationTabs} selectedTab={currentTab} />
      </div>
      <div className={classes.contentWrapper}>{displayTabs()}</div>
    </StudioModal.Dialog>
  );
});

SettingsModal.displayName = 'SettingsModal';

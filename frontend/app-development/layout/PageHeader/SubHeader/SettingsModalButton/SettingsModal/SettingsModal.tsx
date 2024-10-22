import type { ReactElement } from 'react';
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
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
import type { SettingsModalTabId } from 'app-development/types/SettingsModalTab';
import { createNavigationTab } from './utils';
import { useTranslation } from 'react-i18next';
import { PolicyTab } from './components/Tabs/PolicyTab';
import { AboutTab } from './components/Tabs/AboutTab';
import { AccessControlTab } from './components/Tabs/AccessControlTab';
import { SetupTab } from './components/Tabs/SetupTab';
import { type SettingsModalHandle } from 'app-development/types/SettingsModalHandle';
import { StudioContentMenu } from '@studio/components';

export const SettingsModal = forwardRef<SettingsModalHandle, {}>(({}, ref): ReactElement => {
  const { t } = useTranslation();

  const [currentTab, setCurrentTab] = useState<SettingsModalTabId>('about');
  const dialogRef = useRef<HTMLDialogElement>();

  const openSettings = useCallback(
    (tab: SettingsModalTab = currentTab) => {
      setCurrentTab(tab);
      dialogRef.current?.showModal();
    },
    [currentTab],
  );

  useImperativeHandle<SettingsModalHandle, SettingsModalHandle>(ref, () => ({ openSettings }), [
    openSettings,
  ]);

  const aboutTabId: SettingsModalTabId = 'about';
  const setupTabId: SettingsModalTabId = 'setup';
  const policyTabId: SettingsModalTabId = 'policy';
  const accessControlTabId: SettingsModalTabId = 'access_control';

  const leftNavigationTabs: LeftNavigationTab[] = [
    createNavigationTab(
      <InformationSquareIcon className={classes.icon} />,
      t(`settings_modal.left_nav_tab_${aboutTabId}`),
      aboutTabId,
    ),
    createNavigationTab(
      <SidebarBothIcon className={classes.icon} />,
      t(`settings_modal.left_nav_tab_${setupTabId}`),
      setupTabId,
    ),
    createNavigationTab(
      <ShieldLockIcon className={classes.icon} />,
      t(`settings_modal.left_nav_tab_${policyTabId}`),
      policyTabId,
    ),
    createNavigationTab(
      <TimerStartIcon className={classes.icon} />,
      t(`settings_modal.left_nav_tab_${accessControlTabId}`),
      accessControlTabId,
    ),
  ];

  const displayTabs = () => {
    switch (currentTab) {
      case aboutTabId: {
        return <AboutTab />;
      }
      case setupTabId: {
        return <SetupTab />;
      }
      case policyTabId: {
        return <PolicyTab />;
      }
      case accessControlTabId: {
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
        <StudioContentMenu
          contentTabs={leftNavigationTabs}
          selectedTabId={currentTab}
          onChangeTab={setCurrentTab}
        />
      </div>
      <div className={classes.contentWrapper}>{displayTabs()}</div>
    </StudioModal.Dialog>
  );
});

SettingsModal.displayName = 'SettingsModal';

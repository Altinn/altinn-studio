import type { ReactNode } from 'react';
import React, { useState } from 'react';
import classes from './SettingsModal.module.css';
import { Heading } from '@digdir/design-system-react';
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

export type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: SettingsModalTab;
};

export const SettingsModal = ({ isOpen, onClose, defaultTab }: SettingsModalProps): ReactNode => {
  const { t } = useTranslation();

  const [currentTab, setCurrentTab] = useState<SettingsModalTab>(defaultTab || 'about');

  const aboutTabId: SettingsModalTab = 'about';
  const setupTabId: SettingsModalTab = 'setup';
  const policyTabId: SettingsModalTab = 'policy';
  const accessControlTabId: SettingsModalTab = 'access_control';

  const leftNavigationTabs: LeftNavigationTab[] = [
    createNavigationTab(
      <InformationSquareIcon className={classes.icon} />,
      aboutTabId,
      () => changeTabTo(aboutTabId),
      currentTab,
    ),
    createNavigationTab(
      <SidebarBothIcon className={classes.icon} />,
      setupTabId,
      () => changeTabTo(setupTabId),
      currentTab,
    ),
    createNavigationTab(
      <ShieldLockIcon className={classes.icon} />,
      policyTabId,
      () => changeTabTo(policyTabId),
      currentTab,
    ),
    createNavigationTab(
      <TimerStartIcon className={classes.icon} />,
      accessControlTabId,
      () => changeTabTo(accessControlTabId),
      currentTab,
    ),
  ];

  const changeTabTo = (tabId: SettingsModalTab) => {
    setCurrentTab(tabId);
  };

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
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className={classes.headingWrapper}>
          <CogIcon className={classes.icon} />
          <Heading level={1} size='small'>
            {t('settings_modal.heading')}
          </Heading>
        </div>
      }
      closeButtonLabel={t('settings_modal.close_button_label')}
    >
      <div className={classes.modalContent}>
        <div className={classes.leftNavWrapper}>
          <LeftNavigationBar tabs={leftNavigationTabs} selectedTab={currentTab} />
        </div>
        <div className={classes.contentWrapper}>{displayTabs()}</div>
      </div>
    </StudioModal>
  );
};

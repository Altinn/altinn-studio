import type { ReactNode } from 'react';
import React, { useState } from 'react';
import classes from './SettingsModal.module.css';
import { Heading } from '@digdir/design-system-react';
import {
  CogIcon,
  InformationSquareIcon,
  PersonSuitIcon,
  ShieldLockIcon,
  SidebarBothIcon,
} from '@navikt/aksel-icons';
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
  org: string;
  app: string;
};

/**
 * @component
 *    Displays the settings modal
 *
 * @property {boolean}[isOpen] - Flag for if the modal is open
 * @property {function}[onClose] - Function to be executed on close
 *
 * @returns {ReactNode} - The rendered component
 */
export const SettingsModal = ({ isOpen, onClose, org, app }: SettingsModalProps): ReactNode => {
  const { t } = useTranslation();

  const [currentTab, setCurrentTab] = useState<SettingsModalTab>('about');

  /**
   * Ids for the navigation tabs
   */
  const aboutTabId: SettingsModalTab = 'about';
  const setupTabId: SettingsModalTab = 'setup';
  const policyTabId: SettingsModalTab = 'policy';
  const accessControlTabId: SettingsModalTab = 'accessControl';

  /**
   * The tabs to display in the navigation bar
   */
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
      <PersonSuitIcon className={classes.icon} />,
      accessControlTabId,
      () => changeTabTo(accessControlTabId),
      currentTab,
    ),
  ];

  /**
   * Changes the active tab
   * @param tabId
   */
  const changeTabTo = (tabId: SettingsModalTab) => {
    setCurrentTab(tabId);
  };

  /**
   * Displays the currently selected tab and its content
   * @returns
   */
  const displayTabs = () => {
    switch (currentTab) {
      case 'about': {
        return <AboutTab org={org} app={app} />;
      }
      case 'setup': {
        return <SetupTab org={org} app={app} />;
      }
      case 'policy': {
        return <PolicyTab org={org} app={app} />;
      }
      case 'accessControl': {
        return <AccessControlTab org={org} app={app} />;
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
    >
      <div className={classes.modalContent}>
        <div className={classes.leftNavWrapper}>
          <LeftNavigationBar
            tabs={leftNavigationTabs}
            className={classes.leftNavigationBar}
            selectedTab={currentTab}
          />
        </div>
        <div className={classes.contentWrapper}>{displayTabs()}</div>
      </div>
    </StudioModal>
  );
};

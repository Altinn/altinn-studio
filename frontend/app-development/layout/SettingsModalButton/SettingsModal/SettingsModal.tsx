import React, { ReactNode, useState } from 'react';
import classes from './SettingsModal.module.css';
import { Heading } from '@digdir/design-system-react';
import {
  CogIcon,
  InformationSquareIcon,
  PersonSuitIcon,
  MonitorIcon,
  ShieldLockIcon,
} from '@navikt/aksel-icons';
import { Modal } from 'app-shared/components/Modal';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { LeftNavigationBar } from 'app-shared/components/LeftNavigationBar';
import { SettingsModalTab } from 'app-development/types/SettingsModalTab';
import { createNavigationTab } from './utils';
import { useTranslation } from 'react-i18next';
import { PolicyTab } from './components/Tabs/PolicyTab';
import { AboutTab } from './components/Tabs/AboutTab';
import { LocalChangesTab } from './components/Tabs/LocalChangesTab';
import { AccessControlTab } from './components/Tabs/AccessControlTab';

export type SettingsModalProps = {
  /**
   * Flag for if the modal is open
   */
  isOpen: boolean;
  /**
   * Function to be executed on close
   * @returns void
   */
  onClose: () => void;
  /**
   * The org
   */
  org: string;
  /**
   * The app
   */
  app: string;
};

/**
 * @component
 *    Displays the settings modal.
 *
 * @property {boolean}[isOpen] - Flag for if the modal is open
 * @property {function}[onClose] - Function to be executed on close
 * @property {string}[org] - The org
 * @property {string}[app] - The app
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
  const policyTabId: SettingsModalTab = 'policy';
  const localChangesTabId: SettingsModalTab = 'localChanges';
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
    createNavigationTab(
      <MonitorIcon className={classes.icon} />,
      localChangesTabId,
      () => changeTabTo(localChangesTabId),
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
      case 'policy': {
        return <PolicyTab org={org} app={app} />;
      }
      case 'accessControl': {
        return <AccessControlTab org={org} app={app} />;
      }
      case 'localChanges': {
        return <LocalChangesTab org={org} app={app} />;
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className={classes.headingWrapper}>
          <CogIcon className={classes.icon} />
          <Heading level={1} size='medium'>
            {t('settings_modal.heading')}
          </Heading>
        </div>
      }
    >
      <div className={classes.modalContent}>
        <div className={classes.leftNavWrapper}>
          <LeftNavigationBar tabs={leftNavigationTabs} className={classes.leftNavigationBar} />
        </div>
        <div className={classes.tabWrapper}>{displayTabs()}</div>
      </div>
    </Modal>
  );
};

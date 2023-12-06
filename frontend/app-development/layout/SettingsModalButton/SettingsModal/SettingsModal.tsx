import React, { forwardRef, useState } from 'react';
import classes from './SettingsModal.module.css';
import { Heading } from '@digdir/design-system-react';
import {
  CogIcon,
  InformationSquareIcon,
  PersonSuitIcon,
  MonitorIcon,
  ShieldLockIcon,
  SidebarBothIcon,
} from '@navikt/aksel-icons';
import { StudioModal } from '@studio/components';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { LeftNavigationBar } from 'app-shared/components/LeftNavigationBar';
import { SettingsModalTab } from 'app-development/types/SettingsModalTab';
import { createNavigationTab } from './utils';
import { useTranslation } from 'react-i18next';
import { PolicyTab } from './components/Tabs/PolicyTab';
import { AboutTab } from './components/Tabs/AboutTab';
import { LocalChangesTab } from './components/Tabs/LocalChangesTab';
import { AccessControlTab } from './components/Tabs/AccessControlTab';
import { SetupTab } from './components/Tabs/SetupTab';

export type SettingsModalProps = {
  onClose: () => void;
  org: string;
  app: string;
};

/**
 * @component
 *    Displays the settings modal.
 *
 * @property {function}[onClose] - Function to execute on close
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {JSX.Element} - The rendered component
 */
export const SettingsModal = forwardRef<HTMLDialogElement, SettingsModalProps>(
  ({ onClose, org, app }, ref): JSX.Element => {
    const { t } = useTranslation();

    const [currentTab, setCurrentTab] = useState<SettingsModalTab>('about');

    /**
     * Ids for the navigation tabs
     */
    const aboutTabId: SettingsModalTab = 'about';
    const setupTabId: SettingsModalTab = 'setup';
    const policyTabId: SettingsModalTab = 'policy';
    const localChangesTabId: SettingsModalTab = 'localChanges';
    const accessControlTabId: SettingsModalTab = 'accessControl';

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
      createNavigationTab(
        <MonitorIcon className={classes.icon} />,
        localChangesTabId,
        () => changeTabTo(localChangesTabId),
        currentTab,
      ),
    ];

    const changeTabTo = (tabId: SettingsModalTab) => {
      setCurrentTab(tabId);
    };

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
        case 'localChanges': {
          return <LocalChangesTab org={org} app={app} />;
        }
      }
    };

    return (
      <StudioModal
        ref={ref}
        onClose={onClose}
        header={
          <div className={classes.headingWrapper}>
            <CogIcon className={classes.icon} />
            <Heading level={1} size='medium'>
              {t('settings_modal.heading')}
            </Heading>
          </div>
        }
        content={
          <div className={classes.modalContent}>
            <div className={classes.leftNavWrapper}>
              <LeftNavigationBar
                tabs={leftNavigationTabs}
                className={classes.leftNavigationBar}
                selectedTab={currentTab}
              />
            </div>
            {displayTabs()}
          </div>
        }
      />
    );
  },
);

SettingsModal.displayName = 'SettingsModal';

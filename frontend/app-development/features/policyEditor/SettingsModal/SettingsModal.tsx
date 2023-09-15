import React, { ReactNode, useState } from 'react';
import classes from './SettingsModal.module.css';
import { Button, Heading } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { CogIcon, InformationSquareIcon, ShieldLockIcon } from '@navikt/aksel-icons';
import { Modal } from 'app-shared/components/Modal';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { LeftNavigationBar } from 'app-shared/components/LeftNavigationBar';
import { SettingsModalTab } from 'app-development/types/SettingsModalTab';

const getIsActiveTab = (currentTab: SettingsModalTab, tabId: SettingsModalTab) => {
  return currentTab === tabId;
};

const createNavigationTab = (
  icon: ReactNode,
  tabId: SettingsModalTab,
  onClick: () => void,
  currentTab: SettingsModalTab
): LeftNavigationTab => {
  return {
    icon,
    tabName: `settings_modal.left_nav_tab_${tabId}`,
    tabId,
    action: {
      type: 'button',
      onClick,
    },
    isActiveTab: getIsActiveTab(currentTab, tabId),
  };
};

/**
 * Displays the settings modal.
 *
 * @returns {React.ReactNode}
 */
export const SettingsModal = (): React.ReactNode => {
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(true);
  const [currentTab, setCurrentTab] = useState<SettingsModalTab>('about');

  const aboutTabId: SettingsModalTab = 'about';
  const policyTabId: SettingsModalTab = 'policy';

  const leftNavigationTabs: LeftNavigationTab[] = [
    createNavigationTab(
      <InformationSquareIcon className={classes.icon} />,
      aboutTabId,
      () => changeTabTo(aboutTabId),
      currentTab
    ),
    createNavigationTab(
      <ShieldLockIcon className={classes.icon} />,
      policyTabId,
      () => changeTabTo(policyTabId),
      currentTab
    ),
  ];

  const changeTabTo = (tabId: SettingsModalTab) => {
    setCurrentTab(tabId);
  };

  return (
    <>
      {/* TODO - Move button to the correct place to open the modal from. Issue: #11047 */}
      <Button onClick={() => setIsOpen(true)}>{t('settings_modal.open_button')}</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
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
            <LeftNavigationBar tabs={leftNavigationTabs} className={classes.leftNavigationBar} />
          </div>
          <div className={classes.tabWrapper}>
            <p> {currentTab}</p>
          </div>
        </div>
      </Modal>
    </>
  );
};

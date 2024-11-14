import type { ReactElement } from 'react';
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import classes from './SettingsModal.module.css';
import { CogIcon } from '@studio/icons';
import { StudioModal, StudioContentMenu } from '@studio/components';
import type { SettingsModalTabId } from '../../../../../types/SettingsModalTabId';
import { useTranslation } from 'react-i18next';
import { PolicyTab } from './components/Tabs/PolicyTab';
import { AboutTab } from './components/Tabs/AboutTab';
import { AccessControlTab } from './components/Tabs/AccessControlTab';
import { SetupTab } from './components/Tabs/SetupTab';
import { type SettingsModalHandle } from '../../../../../types/SettingsModalHandle';
import { useSettingsModalMenuTabConfigs } from './hooks/useSettingsModalMenuTabConfigs';
import { Maskinporten } from './components/Tabs/Maskinporten';

export const SettingsModal = forwardRef<SettingsModalHandle, {}>(({}, ref): ReactElement => {
  const { t } = useTranslation();

  const [currentTab, setCurrentTab] = useState<SettingsModalTabId>('about');
  const dialogRef = useRef<HTMLDialogElement>();
  const menuTabConfigs = useSettingsModalMenuTabConfigs();

  const openSettings = useCallback(
    (tab: SettingsModalTabId = currentTab) => {
      setCurrentTab(tab);
      dialogRef.current?.showModal();
    },
    [currentTab],
  );

  useImperativeHandle<SettingsModalHandle, SettingsModalHandle>(ref, () => ({ openSettings }), [
    openSettings,
  ]);

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
      case 'maskinporten': {
        return <Maskinporten />;
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
          selectedTabId={currentTab}
          onChangeTab={(tabId: SettingsModalTabId) => setCurrentTab(tabId)}
        >
          {menuTabConfigs.map((contentTab) => (
            <StudioContentMenu.ButtonTab
              key={contentTab.tabId}
              tabName={contentTab.tabName}
              tabId={contentTab.tabId}
              icon={contentTab.icon}
            />
          ))}
        </StudioContentMenu>
      </div>
      <div className={classes.contentWrapper}>{displayTabs()}</div>
    </StudioModal.Dialog>
  );
});

SettingsModal.displayName = 'SettingsModal';

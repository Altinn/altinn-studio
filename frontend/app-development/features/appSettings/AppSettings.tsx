import React, { useState } from 'react';
import type { ReactElement } from 'react';
import classes from './AppSettings.module.css';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { TabsContent } from './components/TabsContent';
import { ContentMenu } from './components/ContentMenu';
import { useAppSettingsMenuTabConfigs } from './hooks/useAppSettingsMenuTabConfigs';
import {
  getCurrentSettingsTab,
  isValidSettingsTab,
  navigateToSettingsTab,
} from './utils/navigationUtils';

export const settingsPageQueryParamKey: string = 'currentTab';

export function AppSettings(): ReactElement {
  const { t } = useTranslation();
  const settingsPageTabs = useAppSettingsMenuTabConfigs();
  const tabIds: SettingsPageTabId[] = settingsPageTabs.map(({ tabId }) => tabId);

  const currentTabFromQueryParam: SettingsPageTabId = getCurrentSettingsTab();
  const [currentTab, setCurrentTab] = useState<SettingsPageTabId>(currentTabFromQueryParam);

  const navigateToNewTab = (tabId: SettingsPageTabId): void => {
    const isValid: boolean = isValidSettingsTab(tabId, tabIds);

    if (isValid) {
      navigateToSettingsTab(tabId);
      setCurrentTab(tabId);
    } else {
      navigateToSettingsTab('about');
      setCurrentTab('about');
    }
  };

  return (
    <div className={classes.settingsWrapper}>
      <StudioHeading level={2} className={classes.settingsHeading}>
        {t('app_settings.heading')}
      </StudioHeading>
      <div className={classes.pageContentWrapper}>
        <div className={classes.leftNavWrapper}>
          <ContentMenu currentTab={currentTab} onChangeTab={navigateToNewTab} />
        </div>
        <div className={classes.contentWrapper}>
          <TabsContent currentTab={currentTab} />
        </div>
      </div>
    </div>
  );
}

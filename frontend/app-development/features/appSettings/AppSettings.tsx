import React, { useState } from 'react';
import type { ReactElement } from 'react';
import classes from './AppSettings.module.css';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components';
import type { SettingsModalTabId } from 'app-development/types/SettingsModalTabId';
import { TabsContent } from './components/TabsContent';
import { ContentMenu } from './components/ContentMenu';

export function AppSettings(): ReactElement {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState<SettingsModalTabId>('about');

  const handleTabChange = (tabId: SettingsModalTabId): void => {
    setCurrentTab(tabId);
  };

  return (
    <div className={classes.settingsWrapper}>
      <StudioHeading level={2} className={classes.settingsHeading}>
        {t('app_settings.heading')}
      </StudioHeading>
      <div className={classes.pageContentWrapper}>
        <div className={classes.leftNavWrapper}>
          <ContentMenu currentTab={currentTab} onChangeTab={handleTabChange} />
        </div>
        <div className={classes.contentWrapper}>
          <TabsContent currentTab={currentTab} />
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import type { ReactElement } from 'react';
import classes from './AppSettings.module.css';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components';
import type { SettingsPageTabId } from 'app-development/types/SettingsPageTabId';
import { TabsContent } from './components/TabsContent';
import { ContentMenu } from './components/ContentMenu';
import { useAppSettingsMenuTabConfigs } from './hooks/useAppSettingsMenuTabConfigs';
import { getAllSettingsPageTabIds, isValidSettingsTab } from './utils';
import { useNavigate } from 'react-router-dom';

export function AppSettings(): ReactElement {
  const { t } = useTranslation();
  const settingsPageTabs = useAppSettingsMenuTabConfigs();
  const tabIds: SettingsPageTabId[] = getAllSettingsPageTabIds(settingsPageTabs);
  const navigate = useNavigate();

  const navigateToNewTab = (tabId: SettingsPageTabId): void => {
    const isValid: boolean = isValidSettingsTab(tabId, tabIds);

    if (isValid) {
      navigate({ search: `?currentTab=${tabId}` });
    } else {
      navigate({ search: '?currentTab=about' });
    }
  };

  return (
    <div className={classes.settingsWrapper}>
      <StudioHeading level={2} className={classes.settingsHeading}>
        {t('app_settings.heading')}
      </StudioHeading>
      <div className={classes.pageContentWrapper}>
        <div className={classes.leftNavWrapper}>
          <ContentMenu onChangeTab={navigateToNewTab} />
        </div>
        <div className={classes.contentWrapper}>
          <TabsContent />
        </div>
      </div>
    </div>
  );
}

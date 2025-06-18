import React from 'react';
import type { ReactElement } from 'react';
import classes from './AppSettings.module.css';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components';
import { TabsContent } from './components/TabsContent';
import { ContentMenu } from './components/ContentMenu';

export function AppSettings(): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={classes.settingsWrapper}>
      <StudioHeading level={2} className={classes.settingsHeading}>
        {t('app_settings.heading')}
      </StudioHeading>
      <div className={classes.pageContentWrapper}>
        <div className={classes.leftNavWrapper}>
          <ContentMenu />
        </div>
        <div className={classes.contentWrapper}>
          <TabsContent />
        </div>
      </div>
    </div>
  );
}

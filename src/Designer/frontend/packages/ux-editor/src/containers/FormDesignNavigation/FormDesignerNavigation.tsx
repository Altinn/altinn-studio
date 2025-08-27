import { Link } from '@digdir/designsystemet-react';
import React from 'react';
import classes from './FormDesignerNavigation.module.css';
import { useTranslation } from 'react-i18next';
import { TaskCardBar } from '../../components/TaskNavigation/TaskCardBar';
import { SettingsTabs } from '../../components/Settings/SettingsTabs';
import { StudioAlert } from 'libs/studio-components-legacy/src';
import { LayoutPageOverviewFeedback } from '../../components/TaskNavigation/LayoutPageOverviewFeedback';

export const FormDesignerNavigation = () => {
  const { t } = useTranslation();

  return (
    <div className={classes.wrapper}>
      <main className={classes.container}>
        <StudioAlert size='md' className={classes.alert}>
          {t('ux_editor.info.new_overview_page')}
        </StudioAlert>
        <div className={classes.panel}>
          <div className={classes.content}>
            <TaskCardBar />
            <SettingsTabs />
          </div>
          <footer className={classes.footer}>
            <Link href='/info/contact'>{t('general.contact')}</Link>
            <LayoutPageOverviewFeedback />
          </footer>
        </div>
      </main>
    </div>
  );
};

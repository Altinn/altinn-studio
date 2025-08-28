import { Link } from '@digdir/designsystemet-react';
import React from 'react';
import classes from './Home.module.css';
import { useTranslation } from 'react-i18next';
import { SettingsTabs } from '../../components/Home/Settings/SettingsTabs';
import { StudioAlert } from '@studio/components-legacy';
import { TaskCardBar } from '../../components/Home/TaskCardBar/TaskCardBar';
import { LayoutPageOverviewFeedback } from '../../components/Home/TaskCardBar/LayoutPageOverviewFeedback';

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

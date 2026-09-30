import { StudioLink } from '@studio/components';
import classes from './FormDesignerNavigation.module.css';
import { useTranslation } from 'react-i18next';
import { TaskCardBar } from '../../components/TaskNavigation/TaskCardBar';
import { SettingsTabs } from '../../components/Settings/SettingsTabs';
import { LayoutPageOverviewFeedback } from '../../components/TaskNavigation/LayoutPageOverviewFeedback';

export const FormDesignerNavigation = () => {
  const { t } = useTranslation();

  return (
    <div className={classes.wrapper}>
      <main className={classes.container}>
        <div className={classes.panel}>
          <div className={classes.content}>
            <TaskCardBar />
            <SettingsTabs />
          </div>
          <footer className={classes.footer}>
            <StudioLink href='/info/contact'>{t('general.contact')}</StudioLink>
            <LayoutPageOverviewFeedback />
          </footer>
        </div>
      </main>
    </div>
  );
};

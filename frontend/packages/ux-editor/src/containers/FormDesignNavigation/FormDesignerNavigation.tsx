import { Link } from '@digdir/designsystemet-react';
import React from 'react';
import classes from './FormDesignerNavigation.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { TaskCardBar } from '../../components/TaskNavigation/TaskCardBar';
import { SettingsTabs } from '../../components/Settings/SettingsTabs';
import { StudioAlert } from '@studio/components-legacy';

export const FormDesignerNavigation = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: appConfigData } = useAppConfigQuery(org, app);

  return (
    <div className={classes.wrapper}>
      <main className={classes.container}>
        <StudioAlert size='md' className={classes.alert}>
          {t('ux_editor.info.new_overview_page')}
        </StudioAlert>
        <div className={classes.panel}>
          <div className={classes.content}>
            <div className={classes.header}>{appConfigData?.serviceName}</div>
            <TaskCardBar />
            <SettingsTabs />
          </div>
          <footer className={classes.footer}>
            <Link href='/contact'>{t('general.contact')}</Link>
          </footer>
        </div>
      </main>
    </div>
  );
};

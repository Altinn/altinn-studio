import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components';
import classes from './AppUpgrade.module.css';

function AppUpgrade(): ReactElement {
  const { t } = useTranslation();

  return (
    <main className={classes.container}>
      <StudioHeading level={1}>{t('app_upgrade.heading')}</StudioHeading>
    </main>
  );
}

export default AppUpgrade;

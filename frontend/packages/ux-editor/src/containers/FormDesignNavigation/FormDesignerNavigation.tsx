import { Link, Paragraph } from '@digdir/designsystemet-react';
import React from 'react';
import classes from './FormDesignerNavigation.module.css';
import { useTranslation } from 'react-i18next';

export type FormDesignerNavigationProps = {
  appConfig: string;
};

export const FormDesignerNavigation = ({ appConfig }: FormDesignerNavigationProps) => {
  const { t } = useTranslation();
  return (
    <div className={classes.wrapper}>
      <main className={classes.container}>
        <div className={classes.panel}>
          <div className={classes.content}>
            <Paragraph>{appConfig}</Paragraph>
          </div>
          <footer className={classes.footer}>
            <Link href='/contact'>{t('general.contact')}</Link>
          </footer>
        </div>
      </main>
    </div>
  );
};

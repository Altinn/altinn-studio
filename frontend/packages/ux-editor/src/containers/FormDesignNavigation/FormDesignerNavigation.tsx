import { Link, Paragraph } from '@digdir/designsystemet-react';
import React from 'react';
import classes from './FormDesignerNavigation.module.css';
import { useTranslation } from 'react-i18next';
import { TaskCardBar } from '../TaskCardBar';
import { StudioHeading, StudioParagraph } from '@studio/components';

export type FormDesignerNavigationProps = {
  appConfig: string;
};

export const FormDesignerNavigation = ({ appConfig }: FormDesignerNavigationProps) => {
  const { t } = useTranslation();
  return (
    <div className={classes.wrapper}>
      <main className={classes.container}>
        <div className={classes.panel}>
          <StudioHeading size='sm'>Appnavn</StudioHeading>
          <StudioParagraph size='sm'>Velg en oppgave du vil utforme</StudioParagraph>
          <div className={classes.content}>
            <TaskCardBar />
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

import React from 'react';
import classes from './NotFoundPage.module.css';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <div className={classes.wrapper}>
      <Heading level={1} size='medium'>
        {t('not_found_page.heading')}
      </Heading>
      <Paragraph>{t('not_found_page.text')}</Paragraph>
    </div>
  );
};

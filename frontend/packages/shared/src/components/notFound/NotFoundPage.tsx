import React from 'react';
import classes from './NotFoundPage.module.css';
import { Heading, Paragraph, Link } from '@digdir/design-system-react';
import { Trans, useTranslation } from 'react-i18next';

/**
 * Displays the 404 - Not found page
 */
export const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <div className={classes.wrapper}>
      <div className={classes.contentWrapper}>
        <img src={require('./images/PCImage404.png')} alt='' />
        <div className={classes.textWrapper}>
          <Heading level={1} size='large'>
            {t('not_found_page.heading')}
          </Heading>
          <Paragraph size='small' className={classes.paragraph}>
            <Trans i18nKey='not_found_page.text'>
              <Link href='mailto:tjenesteeier@altinn.no'>tjenesteeier@altinn.no</Link>
            </Trans>
          </Paragraph>
          <Link href='/' size='small' className={classes.link}>
            {t('not_found_page.redirect_to_dashboard')}
          </Link>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import classes from './ErrorPage.module.css';
import { Heading, Link } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

/**
 * @component
 *    Displays an error page
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ErrorPage = (): React.JSX.Element => {
  const { t } = useTranslation();
  return (
    <div className={classes.pageWrapper}>
      <Heading size='medium' level={1} spacing>
        {t('resourceadm.error_page_text')}
      </Heading>
      <Link href='/'>{t('resourceadm.error_back_to_dashboard')}</Link>
    </div>
  );
};

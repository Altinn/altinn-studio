import React from 'react';
import classes from './ErrorPage.module.css';
import { StudioHeading, StudioLink } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { UrlConstants } from '../../utils/urlUtils';

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
      <StudioHeading size='md' level={1} spacing>
        {t('resourceadm.error_page_text')}
      </StudioHeading>
      <StudioLink href={UrlConstants.DASHBOARD}>
        {t('resourceadm.error_back_to_dashboard')}
      </StudioLink>
    </div>
  );
};

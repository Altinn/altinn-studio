import React from 'react';
import { Alert, Paragraph, Link } from '@digdir/designsystemet-react';
import { Trans, useTranslation } from 'react-i18next';
import classes from './RepoOwnedByPersonInfo.module.css';

export const RepoOwnedByPersonInfo = () => {
  const { t } = useTranslation();
  return (
    <>
      <Alert>{t('app_deployment.private_app_owner')}</Alert>
      <div className={classes.infoContainer}>
        <div className={classes.textContainer}>
          <Paragraph>{t('app_deployment.private_app_owner_info')}</Paragraph>
          <Paragraph>
            <Trans
              i18nKey={'app_deployment.private_app_owner_help'}
              components={{ a: <Link href='/info/contact'> </Link> }}
            />
          </Paragraph>
          <Paragraph>{t('app_deployment.private_app_owner_options')}</Paragraph>
        </div>
      </div>
    </>
  );
};

import React from 'react';
import classes from './Documentation.module.css';
import { Heading, Link } from '@digdir/designsystemet-react';
import { ExternalLinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';

export const Documentation = (): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className={classes.documentation}>
      <Heading level={2} size='xxsmall'>
        {t('overview.documentation.title')}
      </Heading>
      <Link
        href='https://docs.altinn.studio/nb/app/getting-started/create-app/'
        className={classes.link}
      >
        <span>{t('overview.documentation.link')}</span>
        <ExternalLinkIcon className={classes.linkIcon} />
      </Link>
    </div>
  );
};

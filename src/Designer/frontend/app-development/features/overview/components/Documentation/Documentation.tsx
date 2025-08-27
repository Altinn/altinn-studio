import React from 'react';
import classes from './Documentation.module.css';
import { Heading, Link } from '@digdir/designsystemet-react';
import { ExternalLinkIcon } from 'libs/studio-icons/src';
import { useTranslation } from 'react-i18next';
import { altinnDocsUrl } from 'app-shared/ext-urls';

export const Documentation = (): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className={classes.documentation}>
      <Heading level={2} size='xxsmall'>
        {t('overview.documentation.title')}
      </Heading>
      <Link
        href={altinnDocsUrl({ relativeUrl: 'altinn-studio/getting-started/' })}
        className={classes.link}
      >
        <span>{t('overview.documentation.link')}</span>
        <ExternalLinkIcon className={classes.linkIcon} />
      </Link>
    </div>
  );
};

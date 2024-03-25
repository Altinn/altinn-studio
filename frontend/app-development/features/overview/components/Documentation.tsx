import React from 'react';
import classes from './Documentation.module.css';
import { Heading, Link, Paragraph } from '@digdir/design-system-react';
import { ExternalLinkIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';

export const Documentation = () => {
  const { t } = useTranslation();
  return (
    <div className={classes.documentation}>
      <Heading level={2} size='xxsmall' className={classes.heading}>
        {t('overview.documentation.title')}
      </Heading>
      <Link
        href='https://docs.altinn.studio/nb/app/getting-started/create-app/'
        className={classes.link}
      >
             <span>
        
        
        {t('overview.documentation.link')}
      </span>
      

        <ExternalLinkIcon className={classes.linkIcon} />
      </Link>
    </div>
  );
};

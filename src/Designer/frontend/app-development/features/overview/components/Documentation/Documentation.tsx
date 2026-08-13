import React from 'react';
import classes from './Documentation.module.css';
import { StudioHeading, StudioLink } from '@studio/components';
import { ExternalLinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { altinnDocsUrl } from 'app-shared/ext-urls';

export const Documentation = (): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className={classes.documentation}>
      <StudioHeading level={2} data-size='2xs'>
        {t('overview.documentation.title')}
      </StudioHeading>
      <StudioLink
        href={altinnDocsUrl({ relativeUrl: 'altinn-studio/getting-started/' })}
        className={classes.link}
      >
        <span>{t('overview.documentation.link')}</span>
        <ExternalLinkIcon className={classes.linkIcon} />
      </StudioLink>
    </div>
  );
};

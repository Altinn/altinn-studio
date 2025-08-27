import React from 'react';
import { StudioHeading } from 'libs/studio-components-legacy/src';
import { StudioParagraph } from 'libs/studio-components/src';
import classes from './LandingPage.module.css';
import { useTranslation } from 'react-i18next';

export function LandingPage(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className={classes.landingPage}>
      <StudioHeading size='small'>{t('app_content_library.landing_page.title')}</StudioHeading>
      <StudioParagraph data-size='md'>
        {t('app_content_library.landing_page.description')}
      </StudioParagraph>
      <img className={classes.image} src={'/designer/img/Altinn-studio-3-blue.svg'} alt='' />
    </div>
  );
}

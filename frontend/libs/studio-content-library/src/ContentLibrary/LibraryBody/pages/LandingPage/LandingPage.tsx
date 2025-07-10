import React from 'react';
import { StudioHeading, StudioParagraph } from '@studio/components-legacy';
import classes from './LandingPage.module.css';
import { useTranslation } from 'react-i18next';
import altinnStudio3BlueSvg from '/assets/Altinn-studio-3-blue.svg';

export function LandingPage(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className={classes.landingPage}>
      <StudioHeading size='small'>{t('app_content_library.landing_page.title')}</StudioHeading>
      <StudioParagraph>{t('app_content_library.landing_page.description')}</StudioParagraph>
      <img className={classes.image} src={altinnStudio3BlueSvg} alt='' />
    </div>
  );
}

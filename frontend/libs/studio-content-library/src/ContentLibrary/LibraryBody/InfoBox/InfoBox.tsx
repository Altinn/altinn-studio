import React from 'react';
import classes from './InfoBox.module.css';
import { StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { PageName } from '../../../types/PageName';
import { infoBoxConfigs } from './infoBoxConfigs';

type InfoBoxProps = {
  pageName: PageName;
};

export function InfoBox({ pageName }: InfoBoxProps): React.ReactElement {
  const { t } = useTranslation();

  const infoBoxConfigForPage = infoBoxConfigs[pageName];

  if (!infoBoxConfigForPage) return null;

  return (
    <div className={classes.infoBoxContainer} title={t('app_content_library.info_box.title')}>
      <img
        src={infoBoxConfigForPage.illustrationReference}
        alt={t(infoBoxConfigForPage.titleTextKey)}
      />
      <div className={classes.description}>
        <StudioParagraph size='medium'>{t(infoBoxConfigForPage.titleTextKey)}</StudioParagraph>
        <StudioParagraph size='xsmall'>
          {t(infoBoxConfigForPage.descriptionTextKey)}
        </StudioParagraph>
      </div>
    </div>
  );
}

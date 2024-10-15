import React from 'react';
import type { InfoBoxProps } from '../../types/InfoBoxProps';
import classes from './InfoBox.module.css';
import { StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';

export const InfoBox = ({
  titleTextKey,
  descriptionTextKey,
  illustrationReference,
}: InfoBoxProps) => {
  const { t } = useTranslation();
  return (
    <div className={classes.infoBoxContainer}>
      <img src={illustrationReference} alt={t(titleTextKey)} />
      <div className={classes.description}>
        <StudioParagraph size='medium'>{t(titleTextKey)}</StudioParagraph>
        <StudioParagraph size='xsmall'>{t(descriptionTextKey)}</StudioParagraph>
      </div>
    </div>
  );
};

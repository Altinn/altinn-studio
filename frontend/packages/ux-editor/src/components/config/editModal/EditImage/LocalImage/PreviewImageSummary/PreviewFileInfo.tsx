import React from 'react';
import classes from './PreviewFileInfo.module.css';
import { StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';

interface PreviewFileInfoProps {
  existingImageUrl: string;
  existingImageDescription?: string;
}

export const PreviewFileInfo = ({
  existingImageUrl,
  existingImageDescription,
}: PreviewFileInfoProps) => {
  const { t } = useTranslation();

  return (
    <div className={classes.fileInfoContainer}>
      <StudioParagraph size='small' className={classes.fileName}>
        {existingImageUrl}
      </StudioParagraph>
      {existingImageDescription ? (
        <StudioParagraph size='small' className={classes.fileDescription}>
          {existingImageDescription}
        </StudioParagraph>
      ) : (
        <StudioParagraph size='small' className={classes.missingFileDescription}>
          {t('ux_editor.properties_panel.images.description_missing')}
        </StudioParagraph>
      )}
    </div>
  );
};

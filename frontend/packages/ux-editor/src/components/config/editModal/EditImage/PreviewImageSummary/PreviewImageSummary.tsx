import React from 'react';
import { ImageIcon } from '@studio/icons';
import { StudioDeleteButton, StudioParagraph } from '@studio/components';
import classes from './PreviewImageSummary.module.css';

export interface PreviewImageSummaryProps {
  existingImageUrl: string;
  existingImageDescription: string;
  onDeleteImage: () => void;
}

export const PreviewImageSummary = ({
  existingImageUrl,
  existingImageDescription,
  onDeleteImage,
}: PreviewImageSummaryProps) => {
  const fileName = existingImageUrl.split('/').pop() || '';
  return (
    <div className={classes.previewContainer}>
      <ImageIcon className={classes.fileIcon} />
      <div className={classes.fileInfoContainer}>
        <StudioParagraph size='small' className={classes.fileName}>
          {fileName}
        </StudioParagraph>
        <StudioParagraph size='small' className={classes.fileDescription}>
          {existingImageDescription}
        </StudioParagraph>
      </div>
      <StudioDeleteButton variant='tertiary' onDelete={onDeleteImage} />
    </div>
  );
};

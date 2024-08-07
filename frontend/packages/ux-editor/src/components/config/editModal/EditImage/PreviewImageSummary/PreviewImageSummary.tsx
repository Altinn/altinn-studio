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
  return (
    <div className={classes.previewContainer}>
      <ImageIcon className={classes.fileIcon} />
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
            {'Beskrivelse mangler'}
          </StudioParagraph>
        )}
      </div>
      <StudioDeleteButton
        title={'Slett bildereferansen fra bildekomponenten'}
        variant='tertiary'
        onDelete={onDeleteImage}
      />
    </div>
  );
};

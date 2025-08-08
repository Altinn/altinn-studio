import React from 'react';
import classes from './PreviewFileInfo.module.css';
import { StudioParagraph } from '@studio/components';
import { FileUtils } from '@studio/pure-functions';

interface PreviewFileInfoProps {
  existingImageUrl: string;
}

export const PreviewFileInfo = ({ existingImageUrl }: PreviewFileInfoProps) => {
  return (
    <div className={classes.fileInfoContainer}>
      <StudioParagraph className={classes.fileName} title={existingImageUrl}>
        {FileUtils.extractFileName(existingImageUrl)}
      </StudioParagraph>
    </div>
  );
};

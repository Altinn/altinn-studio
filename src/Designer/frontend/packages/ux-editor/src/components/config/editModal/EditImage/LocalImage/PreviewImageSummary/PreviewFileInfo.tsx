import React from 'react';
import classes from './PreviewFileInfo.module.css';
import { StudioParagraph } from '@studio/components';
import { FileNameUtils } from 'libs/studio-pure-functions/src';

interface PreviewFileInfoProps {
  existingImageUrl: string;
}

export const PreviewFileInfo = ({ existingImageUrl }: PreviewFileInfoProps) => {
  return (
    <div className={classes.fileInfoContainer}>
      <StudioParagraph className={classes.fileName} title={existingImageUrl}>
        {FileNameUtils.extractFileName(existingImageUrl)}
      </StudioParagraph>
    </div>
  );
};

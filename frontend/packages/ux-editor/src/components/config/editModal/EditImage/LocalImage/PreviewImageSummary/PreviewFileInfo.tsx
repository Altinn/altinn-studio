import React from 'react';
import classes from './PreviewFileInfo.module.css';
import { StudioParagraph } from '@studio/components';
import { FileNameUtils } from '@studio/pure-functions';

interface PreviewFileInfoProps {
  existingImageUrl: string;
}

export const PreviewFileInfo = ({ existingImageUrl }: PreviewFileInfoProps) => {
  return (
    <div className={classes.fileInfoContainer}>
      <StudioParagraph size='small' className={classes.fileName} title={existingImageUrl}>
        {FileNameUtils.extractFilename(existingImageUrl)}
      </StudioParagraph>
    </div>
  );
};

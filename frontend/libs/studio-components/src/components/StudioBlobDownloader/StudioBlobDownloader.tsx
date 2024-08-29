import React, { useMemo } from 'react';
import { BlobDownloader } from '@studio/pure-functions';
import { StudioButton, StudioButtonProps } from '@studio/components';

export type StudioBlobDownloaderProps = {
  data: string;
  fileName: string;
  fileType?: string;
  linkText: string;
} & StudioButtonProps;

export const StudioBlobDownloader = ({
  data,
  fileName,
  fileType = 'application/json',
  linkText,
  ...rest
}: StudioBlobDownloaderProps) => {
  const blobDownloader = useMemo(
    () => new BlobDownloader(data, fileType, fileName),
    [data, fileType, fileName],
  );
  const handleExportClick = () => {
    blobDownloader.handleDownloadClick();
  };

  return (
    <StudioButton {...rest} onClick={handleExportClick} variant='tertiary'>
      {linkText}
    </StudioButton>
  );
};

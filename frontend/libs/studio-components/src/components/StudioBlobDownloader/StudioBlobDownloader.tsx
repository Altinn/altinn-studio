import React, { useMemo } from 'react';
import { BlobDownloader } from '@studio/pure-functions';
import { StudioButton } from '@studio/components';

export type StudioBlobDownloaderProps = {
  data: string;
  fileName: string;
  fileType?: string;
  linkText: string;
};

export const StudioBlobDownloader = ({
  data,
  fileName,
  fileType = 'application/json',
  linkText,
}: StudioBlobDownloaderProps) => {
  const blobDownloader = useMemo(
    () => new BlobDownloader(data, fileType, fileName),
    [data, fileType, fileName],
  );
  const handleExportClick = () => {
    blobDownloader.handleDownloadClick();
  };

  return (
    <StudioButton onClick={handleExportClick} variant='tertiary'>
      {linkText}
    </StudioButton>
  );
};

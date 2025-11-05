import React, { type ReactElement } from 'react';
import { BlobDownloader } from '@studio/pure-functions';
import { StudioButton } from '../StudioButton';
import type { StudioButtonProps } from '../StudioButton';
import { DownloadIcon } from '@studio/icons';

export type StudioBlobDownloaderProps = {
  getData: () => string;
  fileName: string;
  fileType?: string;
  linkText: string;
} & StudioButtonProps;

export function StudioBlobDownloader({
  getData,
  fileName,
  fileType = 'application/json',
  linkText,
  ...rest
}: StudioBlobDownloaderProps): ReactElement {
  const handleExportClick = (): void => {
    const data = getData();
    const blobDownloader = new BlobDownloader(data, fileType, fileName);
    blobDownloader.handleDownloadClick();
  };

  return (
    <StudioButton {...rest} onClick={handleExportClick} variant='tertiary' icon={<DownloadIcon />}>
      {linkText}
    </StudioButton>
  );
}

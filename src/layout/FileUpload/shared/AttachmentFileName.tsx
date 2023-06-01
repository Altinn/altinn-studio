import React from 'react';

import { FileCsvIcon, FileExcelIcon, FileIcon, FilePdfIcon, FileWordIcon } from '@navikt/aksel-icons';

import classes from 'src/layout/FileUpload/shared/AttachmentFileName.module.css';
import { getFileEnding, removeFileEnding } from 'src/utils/attachment';
import { dataElementUrl } from 'src/utils/urls/appUrlHelper';
import { makeUrlRelativeIfSameDomain } from 'src/utils/urls/urlHelper';
import type { IAttachment } from 'src/features/attachments';

export const AttachmentFileName = ({
  attachment,
  mobileView,
}: {
  attachment: Pick<IAttachment, 'name' | 'size' | 'id' | 'uploaded'>;
  mobileView: boolean;
}) => {
  const url = makeUrlRelativeIfSameDomain(dataElementUrl(attachment.id));
  const fileName = (
    <>
      <span className={classes.truncate}>{removeFileEnding(attachment.name)}</span>
      <span className={classes.extension}>{getFileEnding(attachment.name)}</span>
    </>
  );

  return (
    <span className={`${classes.file}`}>
      {!mobileView && (
        <FileExtensionIcon
          fileEnding={getFileEnding(attachment.name)}
          className={`${classes.icon} ${attachment.uploaded ? classes.primaryColor : ''}`}
        />
      )}
      <div className={classes.truncate}>
        {attachment.uploaded ? (
          <a
            href={url}
            className={`${classes.download} ${classes.primaryColor}`}
            data-testid={`attachment-download`}
          >
            {fileName}
          </a>
        ) : (
          <span className={classes.download}>{fileName}</span>
        )}
      </div>
    </span>
  );
};

type FileExtensionIconProps = {
  fileEnding: string;
  className?: string;
};

const FileExtensionIcon = ({ fileEnding, className }: FileExtensionIconProps) => {
  const iconMap = {
    '.pdf': FilePdfIcon,
    '.doc': FileWordIcon,
    '.docx': FileWordIcon,
    '.xls': FileExcelIcon,
    '.xlsx': FileExcelIcon,
    '.csv': FileCsvIcon,
  };

  const IconComponent = iconMap[fileEnding] || FileIcon;
  return (
    <IconComponent
      className={className}
      aria-hidden={true}
    />
  );
};

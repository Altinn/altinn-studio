import React from 'react';

import { FileCsvIcon, FileExcelIcon, FileIcon, FilePdfIcon, FileWordIcon } from '@navikt/aksel-icons';

import { isAttachmentUploaded } from 'src/features/attachments';
import classes from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName.module.css';
import { getFileEnding, removeFileEnding } from 'src/utils/attachment';
import { dataElementUrl } from 'src/utils/urls/appUrlHelper';
import { makeUrlRelativeIfSameDomain } from 'src/utils/urls/urlHelper';
import type { IAttachment } from 'src/features/attachments';

export const AttachmentFileName = ({ attachment, mobileView }: { attachment: IAttachment; mobileView: boolean }) => {
  const url = isAttachmentUploaded(attachment)
    ? makeUrlRelativeIfSameDomain(dataElementUrl(attachment.data.id))
    : undefined;
  const fileName = (
    <>
      <span className={classes.truncate}>{removeFileEnding(attachment.data.filename)}</span>
      <span className={classes.extension}>{getFileEnding(attachment.data.filename)}</span>
    </>
  );

  return (
    <span className={`${classes.file}`}>
      {!mobileView && (
        <FileExtensionIcon
          fileEnding={getFileEnding(attachment.data.filename)}
          className={`${classes.icon} ${attachment.uploaded ? classes.primaryColor : ''}`}
        />
      )}
      <div className={classes.truncate}>
        {attachment.uploaded && url ? (
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

export const FileExtensionIcon = ({ fileEnding, className }: FileExtensionIconProps) => {
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
      aria-hidden
    />
  );
};

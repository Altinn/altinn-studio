import React from 'react';

import { Link } from '@digdir/designsystemet-react';
import { FileCsvIcon, FileExcelIcon, FileIcon, FilePdfIcon, FileWordIcon } from '@navikt/aksel-icons';

import { isAttachmentUploaded } from 'src/features/attachments';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { usePdfModeActive } from 'src/features/pdf/PdfWrapper';
import classes from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName.module.css';
import { getFileEnding, removeFileEnding } from 'src/layout/FileUpload/utils/fileEndings';
import { getDataElementUrl } from 'src/utils/urls/appUrlHelper';
import { makeUrlRelativeIfSameDomain } from 'src/utils/urls/urlHelper';
import type { IAttachment } from 'src/features/attachments';

export const AttachmentFileName = ({ attachment, mobileView }: { attachment: IAttachment; mobileView: boolean }) => {
  const language = useCurrentLanguage();
  const instanceId = useLaxInstanceId();
  const pdfModeActive = usePdfModeActive();
  const url =
    isAttachmentUploaded(attachment) && instanceId
      ? makeUrlRelativeIfSameDomain(getDataElementUrl(instanceId, attachment.data.id, language))
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
          <Link
            href={url}
            className={classes.download}
            data-testid='attachment-download'
            asChild={pdfModeActive}
          >
            {fileName}
          </Link>
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

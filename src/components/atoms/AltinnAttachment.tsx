import React from 'react';

import { Link, List } from '@digdir/design-system-react';

import classes from 'src/components/atoms/AltinnAttachment.module.css';
import { useLanguage } from 'src/hooks/useLanguage';
import { FileExtensionIcon } from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName';
import { getFileEnding, removeFileEnding } from 'src/utils/attachment';
import { makeUrlRelativeIfSameDomain } from 'src/utils/urls/urlHelper';
import type { IDisplayAttachment } from 'src/types/shared';
interface IAltinnAttachmentProps {
  attachments?: IDisplayAttachment[];
  id?: string;
  title?: string;
}

export function AltinnAttachment({ attachments, id, title }: IAltinnAttachmentProps) {
  const { lang, langAsString, selectedLanguage } = useLanguage();

  const filteredAndSortedAttachments = attachments
    ?.filter((attachment) => attachment.name)
    .sort((a, b) => (a.name && b.name ? a.name.localeCompare(b.name, selectedLanguage, { numeric: true }) : 0));

  return (
    <List
      id={id}
      heading={lang(title)}
      data-testid='attachment-list'
      className={classes.attachmentList}
    >
      {filteredAndSortedAttachments?.map((attachment, index) => (
        <List.Item key={index}>
          <Link
            href={attachment.url && makeUrlRelativeIfSameDomain(attachment.url)}
            className={classes.attachmentLink}
            aria-label={langAsString('general.download', [`${attachment.name}`])}
          >
            <FileExtensionIcon
              fileEnding={getFileEnding(attachment.name)}
              className={classes.attachmentIcon}
            />
            <span className={classes.truncate}>{removeFileEnding(attachment.name)}</span>
            <span className={classes.extension}>{getFileEnding(attachment.name)}</span>
          </Link>
        </List.Item>
      ))}
    </List>
  );
}

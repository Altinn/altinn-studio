import React from 'react';
import type { PropsWithChildren } from 'react';

import { Heading, Link, List } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from 'src/components/atoms/AltinnAttachment.module.css';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { FileExtensionIcon } from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName';
import { getFileEnding, removeFileEnding } from 'src/layout/FileUpload/utils/fileEndings';
import { makeUrlRelativeIfSameDomain } from 'src/utils/urls/urlHelper';
import type { IDisplayAttachment } from 'src/types/shared';

interface IAltinnAttachmentsProps {
  attachments?: IDisplayAttachment[];
  id?: string;
  title?: React.ReactNode;
  showLinks: boolean | undefined;
  showDescription?: boolean;
}

export function AltinnAttachments({
  attachments,
  id,
  title,
  showLinks = true,
  showDescription = false,
}: IAltinnAttachmentsProps) {
  const selectedLanguage = useCurrentLanguage();
  const filteredAndSortedAttachments = attachments
    ?.filter((attachment) => attachment.name)
    .sort((a, b) => (a.name && b.name ? a.name.localeCompare(b.name, selectedLanguage, { numeric: true }) : 0));

  return (
    <div
      id={id}
      data-testid='attachment-list'
    >
      {title && (
        <Heading
          level={2}
          data-size='xs'
        >
          {title}
        </Heading>
      )}
      <List.Unordered
        className={classes.attachmentList}
        data-size='sm'
      >
        {filteredAndSortedAttachments?.map((attachment, index) => (
          <Attachment
            key={index}
            attachment={attachment}
            showLink={showLinks}
            showDescription={showDescription}
          />
        ))}
      </List.Unordered>
    </div>
  );
}

interface IAltinnAttachmentProps {
  attachment: IDisplayAttachment;
  showLink: boolean;
  showDescription: boolean;
}

function Attachment({ attachment, showLink, showDescription }: IAltinnAttachmentProps) {
  const currentLanguage = useCurrentLanguage();

  return (
    <List.Item>
      <AttachmentFileName
        attachment={attachment}
        showLink={showLink}
      >
        <div className={classes.attachmentContent}>
          <FileExtensionIcon
            fileEnding={getFileEnding(attachment.name)}
            className={classes.attachmentIcon}
          />
          <div className={classes.attachmentText}>
            {showDescription && attachment.description?.[currentLanguage] && (
              <div className={classes.description}>
                {attachment.description[currentLanguage]}
                <span>&nbsp;&ndash;&ndash;&nbsp;</span>
              </div>
            )}
            <div className={classes.filename}>
              <span className={classes.truncate}>{removeFileEnding(attachment.name)}</span>
              <span className={classes.extension}>{getFileEnding(attachment.name)}</span>
            </div>
          </div>
        </div>
      </AttachmentFileName>
    </List.Item>
  );
}

function AttachmentFileName({
  attachment,
  showLink,
  children,
}: PropsWithChildren<{ attachment: IDisplayAttachment; showLink: boolean }>) {
  const { langAsString } = useLanguage();
  const currentLanguage = useCurrentLanguage();

  if (showLink) {
    return (
      <Link
        href={attachment.url && makeUrlRelativeIfSameDomain(attachment.url)}
        className={cn(classes.attachment, classes.attachmentLink)}
        aria-label={langAsString('general.download', [`${attachment.name}`])}
        aria-description={attachment.description?.[currentLanguage]}
      >
        {children}
      </Link>
    );
  }

  return <span className={classes.attachment}>{children}</span>;
}

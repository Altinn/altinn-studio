import type { PropsWithChildren, ReactElement } from 'react';

import { useCurrentLanguage, useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { Link, List } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from './Attachments.module.css';
import { getFileEnding, removeFileEnding } from './fileEndings';
import { FileExtensionIcon } from './FileExtensionIcon';
import { makeUrlRelativeIfSameDomain } from './makeUrlRelativeIfSameDomain';
import type { DisplayAttachment } from './types';

export type AttachmentsProps = {
  attachments?: DisplayAttachment[];
  id?: string;
  title?: ReactElement;
  showLinks?: boolean;
  showDescription?: boolean;
};

export function Attachments({
  attachments,
  id,
  title,
  showLinks = true,
  showDescription = false,
}: AttachmentsProps) {
  const selectedLanguage = useCurrentLanguage();
  const filteredAndSortedAttachments = attachments
    ?.filter((attachment) => attachment.name)
    .sort((a, b) =>
      a.name && b.name ? a.name.localeCompare(b.name, selectedLanguage, { numeric: true }) : 0,
    );

  return (
    <div id={id} data-testid='attachment-list'>
      {title}
      <List.Unordered className={classes.attachmentList} data-size='sm'>
        {filteredAndSortedAttachments?.map((attachment, index) => (
          <AttachmentItem
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

function AttachmentItem({
  attachment,
  showLink,
  showDescription,
}: {
  attachment: DisplayAttachment;
  showLink: boolean;
  showDescription: boolean;
}) {
  const { lang } = useTranslation();
  const currentLanguage = useCurrentLanguage();
  const descriptionKey = attachment.description?.[currentLanguage];

  return (
    <List.Item>
      <AttachmentFileName attachment={attachment} showLink={showLink}>
        <div className={classes.attachmentContent}>
          <FileExtensionIcon
            fileEnding={getFileEnding(attachment.name)}
            className={classes.attachmentIcon}
          />
          <div className={classes.attachmentText}>
            {showDescription && descriptionKey && (
              <div className={classes.description}>
                {lang(descriptionKey)}
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
}: PropsWithChildren<{ attachment: DisplayAttachment; showLink: boolean }>) {
  const { langAsString } = useTranslation();
  const currentLanguage = useCurrentLanguage();

  if (showLink) {
    return (
      <Link
        href={attachment.url && makeUrlRelativeIfSameDomain(attachment.url)}
        className={cn(classes.attachment, classes.attachmentLink)}
        aria-label={langAsString('general.download', [`${attachment.name}`])}
        aria-description={langAsString(attachment.description?.[currentLanguage])}
      >
        {children}
      </Link>
    );
  }

  return <span className={classes.attachment}>{children}</span>;
}

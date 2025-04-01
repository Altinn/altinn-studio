import React from 'react';

import { Link, List } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from 'src/components/atoms/AltinnAttachment.module.css';
import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { FileExtensionIcon } from 'src/layout/FileUpload/FileUploadTable/AttachmentFileName';
import { getFileEnding, removeFileEnding } from 'src/layout/FileUpload/utils/fileEndings';
import { makeUrlRelativeIfSameDomain } from 'src/utils/urls/urlHelper';
import type { IDisplayAttachment } from 'src/types/shared';

interface IAltinnAttachmentsProps {
  attachments?: IDisplayAttachment[];
  id?: string;
  title?: string;
  links?: boolean;
}

export function AltinnAttachments({ attachments, id, title, links = true }: IAltinnAttachmentsProps) {
  const selectedLanguage = useCurrentLanguage();
  const filteredAndSortedAttachments = attachments
    ?.filter((attachment) => attachment.name)
    .sort((a, b) => (a.name && b.name ? a.name.localeCompare(b.name, selectedLanguage, { numeric: true }) : 0));

  return (
    <List.Root
      id={id}
      data-testid='attachment-list'
    >
      {title && (
        <List.Heading>
          <Lang id={title} />
        </List.Heading>
      )}
      <List.Unordered className={classes.attachmentList}>
        {filteredAndSortedAttachments?.map((attachment, index) => (
          <Attachment
            key={index}
            attachment={attachment}
            link={links}
          />
        ))}
      </List.Unordered>
    </List.Root>
  );
}

interface IAltinnAttachmentProps {
  attachment: IDisplayAttachment;
  link: boolean;
}

function Attachment({ attachment, link }: IAltinnAttachmentProps) {
  const { langAsString } = useLanguage();
  return (
    <List.Item>
      <ConditionalWrapper
        condition={link}
        wrapper={(children) => (
          <Link
            href={attachment.url && makeUrlRelativeIfSameDomain(attachment.url)}
            className={cn(classes.attachment, classes.attachmentLink)}
            aria-label={langAsString('general.download', [`${attachment.name}`])}
          >
            {children}
          </Link>
        )}
        otherwise={(children) => <span className={classes.attachment}>{children}</span>}
      >
        <FileExtensionIcon
          fileEnding={getFileEnding(attachment.name)}
          className={classes.attachmentIcon}
        />
        <span className={classes.truncate}>{removeFileEnding(attachment.name)}</span>
        <span className={classes.extension}>{getFileEnding(attachment.name)}</span>
      </ConditionalWrapper>
    </List.Item>
  );
}

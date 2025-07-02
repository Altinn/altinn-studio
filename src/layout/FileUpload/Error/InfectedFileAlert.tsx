import React from 'react';

import { Alert } from '@digdir/designsystemet-react';

import { type FileUploaderNode, isAttachmentUploaded } from 'src/features/attachments';
import { useAttachmentsFor } from 'src/features/attachments/hooks';
import { FileScanResults } from 'src/features/attachments/types';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/FileUpload/Error/FailedAttachments.module.css';

export function InfectedFileAlert({ node }: { node: FileUploaderNode }) {
  const attachments = useAttachmentsFor(node.baseId);
  const infectedAttachments = attachments.filter(
    (attachment) => isAttachmentUploaded(attachment) && attachment.data.fileScanResult === FileScanResults.Infected,
  );

  return infectedAttachments.length > 0 ? (
    <div className={classes.list}>
      {infectedAttachments.map((attachment) => {
        if (!isAttachmentUploaded(attachment)) {
          return null;
        }
        return (
          <InfectedFileMessage
            key={attachment.data.id}
            filename={attachment.data.filename || 'unknown'}
          />
        );
      })}
    </div>
  ) : null;
}

function InfectedFileMessage({ filename }: { filename: string }) {
  const { langAsString } = useLanguage();

  const truncateFileName = (name: string, startChars: number, endChars: number): string => {
    if (name.length <= startChars + endChars) {
      return name;
    }
    return `${name.substring(0, startChars)}...${name.substring(name.length - endChars)}`;
  };

  return (
    <Alert
      data-size='sm'
      data-color='warning'
      role='alert'
      aria-live='assertive'
      aria-label={langAsString('form_filler.file_uploader_infected_file_alert', [filename])}
    >
      <div className={classes.container}>
        <div className={classes.wrapper}>
          <span className={classes.title}>
            <Lang
              id='form_filler.file_uploader_infected_file_alert'
              params={[truncateFileName(filename, 10, 10), filename]}
            />
          </span>
          <div className={classes.content}>
            <Lang id='form_filler.file_uploader_infected_file_action' />
          </div>
        </div>
      </div>
    </Alert>
  );
}

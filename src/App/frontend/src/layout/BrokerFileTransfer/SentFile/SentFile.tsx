import React from 'react';

import { Tag } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { FileBox } from 'src/layout/BrokerFileTransfer/FileBox';

// Shows the sent file with its file transfer ID, and whether it's fully sent

type SentFileProps = {
  fileTransferId: string;
  fileName?: string;
  isSent: boolean;
};

export function SentFile({ fileTransferId, fileName, isSent }: SentFileProps) {
  return (
    <FileBox
      name={fileName || <Lang id={isSent ? 'broker_file_transfer.sent_file' : 'broker_file_transfer.unsent_file'} />}
      details={
        <Lang
          id='broker_file_transfer.file_transfer_id'
          params={[fileTransferId]}
        />
      }
    >
      <Tag data-color={isSent ? 'success' : 'warning'}>
        <Lang id={isSent ? 'broker_file_transfer.sent' : 'broker_file_transfer.not_fully_sent'} />
      </Tag>
    </FileBox>
  );
}

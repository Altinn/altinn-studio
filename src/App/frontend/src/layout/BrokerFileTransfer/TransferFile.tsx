import React from 'react';

import { Tag } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { FileRow } from 'src/layout/BrokerFileTransfer/FileRow';

type TransferFileProps = {
  fileTransferId: string;
  fileName?: string;
  isSent: boolean;
};

export function TransferFile({ fileTransferId, fileName, isSent }: TransferFileProps) {
  return (
    <FileRow
      name={fileName || <Lang id={isSent ? 'broker_file_transfer.sent_file' : 'broker_file_transfer.unsent_file'} />}
      details={
        <Lang
          id='broker_file_transfer.sent_reference'
          params={[fileTransferId]}
        />
      }
    >
      <Tag data-color={isSent ? 'success' : 'warning'}>
        <Lang id={isSent ? 'broker_file_transfer.sent' : 'broker_file_transfer.not_fully_sent'} />
      </Tag>
    </FileRow>
  );
}

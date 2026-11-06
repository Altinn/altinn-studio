import React from 'react';

import { Tag } from '@digdir/designsystemet-react';

import { useQuery } from 'src/core/queries/reactQuery';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { brokerQueries } from 'src/layout/BrokerFileTransfer/api';
import { FileBox } from 'src/layout/BrokerFileTransfer/FileBox';
import { formatFileSize } from 'src/layout/BrokerFileTransfer/formatting';
import { getBrokerApiBaseUrl } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';

export type SentFileState = 'sent' | 'checking' | 'notFullySent';

const TAGS = {
  sent: { color: 'success', text: 'broker_file_transfer.sent' },
  checking: { color: 'info', text: 'broker_file_transfer.checking' },
  notFullySent: { color: 'warning', text: 'broker_file_transfer.not_fully_sent' },
} as const;

type SentFileProps = {
  fileTransferId: string;
  fileName?: string;
  state: SentFileState;
};

/** Shows the sent file with its file transfer ID, and its size and checksum when Broker can be reached */
export function SentFile({ fileTransferId, fileName, state }: SentFileProps) {
  const language = useCurrentLanguage();
  const overview = useQuery(brokerQueries.fileTransferOverview(getBrokerApiBaseUrl(), fileTransferId)).data;
  // Broker reports a size of 0 until it has received the whole file
  const size = state === 'notFullySent' ? undefined : overview?.fileTransferSize;
  const tag = TAGS[state];

  return (
    <FileBox
      name={
        fileName || (
          <Lang id={state === 'notFullySent' ? 'broker_file_transfer.unsent_file' : 'broker_file_transfer.sent_file'} />
        )
      }
      details={
        <>
          <Lang
            id='broker_file_transfer.file_transfer_id'
            params={[fileTransferId]}
          />
          {size !== undefined && ` · ${formatFileSize(size, language)}`}
          {overview?.checksum && (
            <>
              <br />
              <Lang
                id='broker_file_transfer.sent_checksum'
                params={[overview.checksumAlgorithm ?? 'MD5', overview.checksum]}
              />
            </>
          )}
        </>
      }
    >
      <Tag data-color={tag.color}>
        <Lang id={tag.text} />
      </Tag>
    </FileBox>
  );
}

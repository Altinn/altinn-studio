import React from 'react';

import { Tag } from '@digdir/designsystemet-react';

import { useQuery } from 'src/core/queries/reactQuery';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { brokerQueries } from 'src/layout/BrokerFileTransfer/api';
import {
  isTransferFailed,
  isTransferReceived,
  isTransferSent,
} from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import { FileBox } from 'src/layout/BrokerFileTransfer/FileBox';
import { formatFileSize } from 'src/layout/BrokerFileTransfer/formatting';
import { transferFailureMessage } from 'src/layout/BrokerFileTransfer/messages';
import { RemoveFileButton } from 'src/layout/BrokerFileTransfer/RemoveFileButton';
import { getBrokerApiBaseUrl } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';

const TAGS = {
  sent: { color: 'success', text: 'broker_file_transfer.sent' },
  checking: { color: 'info', text: 'broker_file_transfer.checking' },
  rejected: { color: 'danger', text: 'broker_file_transfer.rejected' },
  notFullySent: { color: 'warning', text: 'broker_file_transfer.not_fully_sent' },
} as const;

type SentFileProps = {
  fileTransferId: string;
  fileTransferStatus: string;
  fileName?: string;
  onRemove?: () => void;
};

/** Shows the sent file with its file transfer ID, and Broker's size, checksum or reason for rejecting it */
export function SentFile({ fileTransferId, fileTransferStatus, fileName, onRemove }: SentFileProps) {
  const language = useCurrentLanguage();
  const overview = useQuery(brokerQueries.fileTransferOverview(getBrokerApiBaseUrl(), fileTransferId)).data;
  const transfer = { fileTransferId, fileTransferStatus };
  const isReceived = isTransferReceived(transfer);
  const isFailed = isTransferFailed(transfer);
  // Broker reports a size of 0 until it has received the whole file
  const size = isReceived ? overview?.fileTransferSize : undefined;
  const failure = isFailed && overview ? transferFailureMessage(overview.fileTransferStatusText) : null;
  const tag =
    TAGS[isTransferSent(transfer) ? 'sent' : isReceived ? 'checking' : isFailed ? 'rejected' : 'notFullySent'];

  return (
    <FileBox
      name={
        fileName ||
        overview?.fileName || (
          <Lang id={isReceived ? 'broker_file_transfer.sent_file' : 'broker_file_transfer.unsent_file'} />
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
      error={failure && <Lang id={failure.key} />}
    >
      <Tag data-color={tag.color}>
        <Lang id={tag.text} />
      </Tag>
      {onRemove && <RemoveFileButton onRemove={onRemove} />}
    </FileBox>
  );
}

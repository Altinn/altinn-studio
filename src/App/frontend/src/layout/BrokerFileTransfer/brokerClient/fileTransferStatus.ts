import { apiFetch } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { BROKER_API_PREFIX } from 'src/layout/BrokerFileTransfer/brokerClient/config';

export const CREATED_STATUS = 'Initialized';
// Broker has the whole file and checks it, then publishes or fails it
export const UPLOADED_STATUS = 'UploadProcessing';
export const FAILED_STATUS = 'Failed';
const PURGED_STATUS = 'Purged';

const SENT_STATUSES = ['Published', 'AllConfirmedDownloaded', PURGED_STATUS];
const RECEIVED_STATUSES = [UPLOADED_STATUS, ...SENT_STATUSES];
const UPLOADABLE_STATUSES = [CREATED_STATUS, 'UploadStarted'];

export type FileTransferOverview = {
  fileTransferStatus: string;
  fileTransferStatusText?: string;
  fileName: string;
  fileTransferSize?: number;
  checksum?: string | null;
  checksumAlgorithm?: 'MD5' | 'SHA256';
  published?: string | null;
};

export type TransferFailure = 'virus' | 'checksum' | 'other';

export class TransferFailedError extends Error {
  constructor(readonly failure: TransferFailure) {
    super(`Broker failed the file transfer (${failure})`);
    this.name = 'TransferFailedError';
  }
}

export function isReceivedStatus(status: string | null | undefined): boolean {
  return RECEIVED_STATUSES.includes(status ?? '');
}

type RecordedTransfer = { fileTransferId?: unknown; fileTransferStatus?: unknown };

export function isTransferReceived({ fileTransferId, fileTransferStatus }: RecordedTransfer): boolean {
  return !!fileTransferId && typeof fileTransferStatus === 'string' && isReceivedStatus(fileTransferStatus);
}

export function isTransferSent({ fileTransferId, fileTransferStatus }: RecordedTransfer): boolean {
  return !!fileTransferId && typeof fileTransferStatus === 'string' && SENT_STATUSES.includes(fileTransferStatus);
}

// Broker's status text says why it failed the transfer, such as "Malware scan failed: Malicious. …"
export function transferFailureOf(statusText: string | undefined): TransferFailure {
  if (statusText?.startsWith('Checksum mismatch')) {
    return 'checksum';
  }
  return statusText?.startsWith('Malware scan failed: Malicious') ? 'virus' : 'other';
}

export function isUploadableStatus(status: string | null | undefined): boolean {
  return UPLOADABLE_STATUSES.includes(status ?? '');
}

// Broker has published, failed or cancelled the transfer, rather than still receiving or checking the file
export function isSettledStatus(status: string): boolean {
  return status !== UPLOADED_STATUS && !isUploadableStatus(status);
}

export async function getFileTransferOverview(
  fileTransferId: string,
  signal?: AbortSignal,
): Promise<FileTransferOverview> {
  const overview = await apiFetch<FileTransferOverview>(
    `${BROKER_API_PREFIX}/filetransfer/${encodeURIComponent(fileTransferId)}`,
    { signal },
  );
  // Broker also purges a transfer it never published once its time to live runs out, which failed for the sender
  return overview.fileTransferStatus === PURGED_STATUS && !overview.published
    ? { ...overview, fileTransferStatus: FAILED_STATUS }
    : overview;
}

export async function hasReceivedFile(fileTransferId: string): Promise<boolean> {
  return isReceivedStatus((await getFileTransferOverview(fileTransferId)).fileTransferStatus);
}

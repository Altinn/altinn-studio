import { apiFetch } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { BROKER_API_PREFIX } from 'src/layout/BrokerFileTransfer/brokerClient/config';

export const CREATED_STATUS = 'Initialized';
export const UPLOADED_STATUS = 'UploadProcessing';

const RECEIVED_STATUSES = [UPLOADED_STATUS, 'Published', 'AllConfirmedDownloaded', 'Purged'];
const UPLOADABLE_STATUSES = [CREATED_STATUS, 'UploadStarted'];

export type FileTransferOverview = {
  fileTransferStatus: string;
  fileName: string;
};

export function isReceivedStatus(status: string | null | undefined): boolean {
  return RECEIVED_STATUSES.includes(status ?? '');
}

export function isTransferSent(transfer: { fileTransferId?: unknown; fileTransferStatus?: unknown }): boolean {
  const status = transfer.fileTransferStatus;
  return !!transfer.fileTransferId && typeof status === 'string' && isReceivedStatus(status);
}

export function isUploadableStatus(status: string | null | undefined): boolean {
  return UPLOADABLE_STATUSES.includes(status ?? '');
}

export async function getFileTransferOverview(
  fileTransferId: string,
  signal?: AbortSignal,
): Promise<FileTransferOverview> {
  return apiFetch<FileTransferOverview>(`${BROKER_API_PREFIX}/filetransfer/${fileTransferId}`, { signal });
}

export async function hasReceivedFile(fileTransferId: string): Promise<boolean> {
  return isReceivedStatus((await getFileTransferOverview(fileTransferId)).fileTransferStatus);
}

import { ApiError } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import {
  FAILED_STATUS,
  getFileTransferOverview,
  isReceivedStatus,
  isUploadableStatus,
  transferFailureOf,
} from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import {
  findUploadPlan,
  planSize,
  readUploadedBytes,
  type UploadPlan,
} from 'src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload';
import type { TransferFailure } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';

export type ResumableTransfer = {
  fileName: string;
  plan: UploadPlan;
  uploaded: number;
};

export type InterruptedTransfer =
  | { status: 'received'; fileName: string; fileTransferStatus: string }
  | { status: 'gone'; plan?: UploadPlan }
  | { status: 'failed'; failure: TransferFailure }
  | ({ status: 'resumable' } & ResumableTransfer);

export async function checkInterruptedTransfer(
  fileTransferId: string,
  signal?: AbortSignal,
): Promise<InterruptedTransfer> {
  const overview = await getFileTransferOverview(fileTransferId, signal).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  });
  if (overview && isReceivedStatus(overview.fileTransferStatus)) {
    return { status: 'received', fileName: overview.fileName, fileTransferStatus: overview.fileTransferStatus };
  }
  if (overview?.fileTransferStatus === FAILED_STATUS) {
    return { status: 'failed', failure: transferFailureOf(overview.fileTransferStatusText) };
  }
  if (!overview || !isUploadableStatus(overview.fileTransferStatus)) {
    return { status: 'gone' };
  }

  const plan = await findUploadPlan(fileTransferId, signal);
  const uploaded = plan ? await readUploadedBytes(plan, signal) : null;
  if (!plan || uploaded === null) {
    return { status: 'gone', plan: plan ?? undefined };
  }
  return { status: 'resumable', fileName: overview.fileName, plan, uploaded };
}

export function expectedFileSize({ plan }: ResumableTransfer): number {
  return planSize(plan);
}

export function isSameFile(transfer: ResumableTransfer, file: File): boolean {
  return file.name === transfer.fileName && file.size === expectedFileSize(transfer);
}

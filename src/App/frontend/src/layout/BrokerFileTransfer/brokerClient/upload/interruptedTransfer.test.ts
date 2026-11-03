import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { getFileTransferOverview } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import {
  findUploadPlan,
  readUploadedBytes,
  type UploadPlan,
} from 'src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload';
import {
  checkInterruptedTransfer,
  isSameFile,
} from 'src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer';

vi.mock('src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus')>()),
  getFileTransferOverview: vi.fn(),
}));
vi.mock('src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload')>()),
  findUploadPlan: vi.fn(),
  readUploadedBytes: vi.fn(),
}));

const plan: UploadPlan = {
  fileTransferId: 'transfer-1',
  parts: [
    { path: '/tus/transfer-1/partial/a', start: 0, length: 2 },
    { path: '/tus/transfer-1/partial/b', start: 2, length: 1 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkInterruptedTransfer', () => {
  it('can be continued from what Broker already holds', async () => {
    vi.mocked(getFileTransferOverview).mockResolvedValue({
      fileTransferStatus: 'UploadStarted',
      fileName: 'report.pdf',
    });
    vi.mocked(findUploadPlan).mockResolvedValue(plan);
    vi.mocked(readUploadedBytes).mockResolvedValue(2);

    await expect(checkInterruptedTransfer('transfer-1')).resolves.toEqual({
      status: 'resumable',
      fileName: 'report.pdf',
      plan,
      uploaded: 2,
    });
  });

  it('is gone when Broker holds no upload for the transfer, so the file is sent again', async () => {
    vi.mocked(getFileTransferOverview).mockResolvedValue({ fileTransferStatus: 'Initialized', fileName: 'report.pdf' });
    vi.mocked(findUploadPlan).mockResolvedValue(null);

    await expect(checkInterruptedTransfer('transfer-1')).resolves.toEqual({ status: 'gone' });
    expect(readUploadedBytes).not.toHaveBeenCalled();
  });

  it('is gone when part of the upload has expired, with the parts that are left', async () => {
    vi.mocked(getFileTransferOverview).mockResolvedValue({
      fileTransferStatus: 'UploadStarted',
      fileName: 'report.pdf',
    });
    vi.mocked(findUploadPlan).mockResolvedValue(plan);
    vi.mocked(readUploadedBytes).mockResolvedValue(null);

    await expect(checkInterruptedTransfer('transfer-1')).resolves.toEqual({ status: 'gone', plan });
  });

  it('is received when Broker already has the whole file', async () => {
    vi.mocked(getFileTransferOverview).mockResolvedValue({ fileTransferStatus: 'Published', fileName: 'report.pdf' });

    await expect(checkInterruptedTransfer('transfer-1')).resolves.toEqual({
      status: 'received',
      fileName: 'report.pdf',
      fileTransferStatus: 'Published',
    });
    expect(findUploadPlan).not.toHaveBeenCalled();
  });

  it.each(['Failed', 'Cancelled'])('is gone when Broker has given the transfer up (%s)', async (fileTransferStatus) => {
    vi.mocked(getFileTransferOverview).mockResolvedValue({ fileTransferStatus, fileName: 'report.pdf' });

    await expect(checkInterruptedTransfer('transfer-1')).resolves.toEqual({ status: 'gone' });
  });

  it('is gone when Broker does not know the transfer', async () => {
    vi.mocked(getFileTransferOverview).mockRejectedValue(new ApiError('Not found', 404));

    await expect(checkInterruptedTransfer('transfer-1')).resolves.toEqual({ status: 'gone' });
  });

  it('passes on other errors', async () => {
    const error = new ApiError('Server error', 500);
    vi.mocked(getFileTransferOverview).mockRejectedValue(error);

    await expect(checkInterruptedTransfer('transfer-1')).rejects.toBe(error);
  });
});

describe('isSameFile', () => {
  it('compares the name, and the size Broker expects', () => {
    const transfer = { fileName: 'report.pdf', plan, uploaded: 2 };

    expect(isSameFile(transfer, new File(['abc'], 'report.pdf'))).toBe(true);
    expect(isSameFile(transfer, new File(['ab'], 'report.pdf'))).toBe(false);
    expect(isSameFile(transfer, new File(['abc'], 'other.pdf'))).toBe(false);
  });
});

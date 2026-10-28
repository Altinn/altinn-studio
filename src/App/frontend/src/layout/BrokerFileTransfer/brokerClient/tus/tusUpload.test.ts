import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureBrokerClient } from 'src/layout/BrokerFileTransfer/brokerClient/config';
import { findUploadPlan } from 'src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload';

const fetchMock = vi.fn<typeof fetch>();
const TUS_PATH = '/broker/api/v1/filetransfer/upload/tus';

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  configureBrokerClient({ baseUrl: 'https://platform.example', redirectIfSessionEnded: async () => false });
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('findUploadPlan', () => {
  it("places Broker's partial uploads in the file in the order they were created", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        partialUploads: [
          { partialUploadId: 'a', uploadLength: 2 },
          { partialUploadId: 'b', uploadLength: 1 },
        ],
      }),
    );

    await expect(findUploadPlan('transfer-1')).resolves.toEqual({
      fileTransferId: 'transfer-1',
      parts: [
        { path: `${TUS_PATH}/transfer-1/partial/a`, start: 0, length: 2 },
        { path: `${TUS_PATH}/transfer-1/partial/b`, start: 2, length: 1 },
      ],
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://platform.example/broker/api/v1/filetransfer/transfer-1/partialuploads',
    );
  });

  it('finds the upload of a file sent in one piece by the file transfer ID', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ partialUploads: [] }))
      .mockResolvedValueOnce(
        new Response(null, { status: 200, headers: { 'Upload-Offset': '1', 'Upload-Length': '3' } }),
      );

    await expect(findUploadPlan('transfer-1')).resolves.toEqual({
      fileTransferId: 'transfer-1',
      parts: [{ path: `${TUS_PATH}/transfer-1`, start: 0, length: 3 }],
    });
  });

  it('looks for an upload in one piece when Broker cannot list partial uploads', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(null, { status: 200, headers: { 'Upload-Offset': '1', 'Upload-Length': '3' } }),
      );

    await expect(findUploadPlan('transfer-1')).resolves.toEqual({
      fileTransferId: 'transfer-1',
      parts: [{ path: `${TUS_PATH}/transfer-1`, start: 0, length: 3 }],
    });
  });

  it('finds nothing when Broker holds no upload for the transfer', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ partialUploads: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(findUploadPlan('transfer-1')).resolves.toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureBrokerClient } from 'src/layout/BrokerFileTransfer/brokerClient/config';
import { getFileTransferOverview } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  configureBrokerClient({ baseUrl: 'https://platform.example', redirectIfSessionEnded: async () => false });
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('getFileTransferOverview', () => {
  it('encodes the id, so slashes in it cannot change which Broker endpoint is called', async () => {
    fetchMock.mockResolvedValue(Response.json({ fileTransferStatus: 'Initialized', fileName: 'report.pdf' }));

    await getFileTransferOverview('../resource/x');

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://platform.example/broker/api/v1/filetransfer/..%2Fresource%2Fx',
    );
  });
});

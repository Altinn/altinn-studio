import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureBrokerClient } from 'src/layout/BrokerFileTransfer/brokerClient/config';
import { initializeFileTransfer } from 'src/layout/BrokerFileTransfer/brokerClient/initializeFileTransfer';

const fetchMock = vi.fn<typeof fetch>();
const input = {
  resourceId: 'broker-resource',
  sender: '312345678',
  recipients: ['987654321'],
  file: new File(['content'], 'report.pdf'),
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  configureBrokerClient({ baseUrl: 'https://platform.example', redirectIfSessionEnded: async () => false });
  fetchMock.mockResolvedValue(Response.json({ fileTransferId: 'transfer-1' }));
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const sentBody = () => JSON.parse(String(fetchMock.mock.calls[0][1]!.body));

describe('initializeFileTransfer', () => {
  it.each([
    ['d41d8cd98f00b204e9800998ecf8427e', 'MD5'],
    ['e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'SHA256'],
  ])('sends the checksum with the algorithm its length shows (%s)', async (checksum, checksumAlgorithm) => {
    await initializeFileTransfer({ ...input, checksum });

    expect(sentBody()).toMatchObject({ checksum, checksumAlgorithm });
  });

  it('leaves the checksum to Broker when there is none', async () => {
    await initializeFileTransfer(input);

    expect(sentBody()).not.toHaveProperty('checksum');
    expect(sentBody()).not.toHaveProperty('checksumAlgorithm');
  });
});

import { vi } from 'vitest';

import { fetchResourceConfiguration } from 'src/layout/BrokerFileTransfer/api';
import { apiFetch } from 'src/layout/BrokerFileTransfer/brokerClient/client';

vi.mock('src/layout/BrokerFileTransfer/brokerClient/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/layout/BrokerFileTransfer/brokerClient/client')>()),
  apiFetch: vi.fn(),
}));

const BASE_URL = 'https://platform.tt02.altinn.no';

describe('fetchResourceConfiguration', () => {
  it("fills in Broker's defaults for settings the resource leaves out", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ maxFileTransferSize: 1000 });

    await expect(fetchResourceConfiguration(BASE_URL, 'broker-resource')).resolves.toEqual({
      maxFileTransferSize: 1000,
      fileTransferTimeToLive: '30.00:00:00',
      purgeFileTransferAfterAllRecipientsConfirmed: true,
      purgeFileTransferGracePeriod: '02:00:00',
      requiredParty: null,
      approvedForDisabledVirusScan: false,
    });
  });

  it('rejects settings of an unexpected type', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ maxFileTransferSize: 'large' });

    await expect(fetchResourceConfiguration(BASE_URL, 'broker-resource')).rejects.toThrow();
  });
});

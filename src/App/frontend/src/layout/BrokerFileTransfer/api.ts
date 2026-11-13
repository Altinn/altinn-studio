import { z } from 'zod';

import { configureBrokerClient } from 'src/layout/BrokerFileTransfer/brokerClient/config';
import { getFileTransferOverview } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import { getResourceConfiguration } from 'src/layout/BrokerFileTransfer/brokerClient/resourceConfiguration';
import { checkInterruptedTransfer } from 'src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer';
import type { FileTransferOverview } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import type { ResourceConfiguration } from 'src/layout/BrokerFileTransfer/brokerClient/resourceConfiguration';
import type { InterruptedTransfer } from 'src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer';

// The Broker requests the app's queries make: the resource's settings, a sent file transfer and an interrupted upload

// brokerClient/ trusts Broker's responses, so the settings the component works from are checked here
const resourceConfigurationSchema = z.object({
  maxFileTransferSize: z.number().nullable(),
  fileTransferTimeToLive: z.string(),
  purgeFileTransferAfterAllRecipientsConfirmed: z.boolean(),
  purgeFileTransferGracePeriod: z.string(),
  requiredParty: z.string().nullable(),
  approvedForDisabledVirusScan: z.boolean(),
});

export async function fetchBrokerResourceConfiguration(
  baseUrl: string,
  resourceId: string,
): Promise<ResourceConfiguration> {
  configureBrokerClient({ baseUrl });
  return resourceConfigurationSchema.parse(await getResourceConfiguration(resourceId));
}

export function fetchBrokerFileTransferOverview(
  baseUrl: string,
  fileTransferId: string,
  signal?: AbortSignal,
): Promise<FileTransferOverview> {
  configureBrokerClient({ baseUrl });
  return getFileTransferOverview(fileTransferId, signal);
}

export function fetchInterruptedBrokerTransfer(
  baseUrl: string,
  fileTransferId: string,
  signal?: AbortSignal,
): Promise<InterruptedTransfer> {
  configureBrokerClient({ baseUrl });
  return checkInterruptedTransfer(fileTransferId, signal);
}

import { z } from 'zod';

import { skipToken } from 'src/core/queries/reactQuery';
import { configureBrokerClient } from 'src/layout/BrokerFileTransfer/brokerClient/config';
import { getResourceConfiguration } from 'src/layout/BrokerFileTransfer/brokerClient/resourceConfiguration';
import { checkInterruptedTransfer } from 'src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer';
import type { UseQueryOptions } from 'src/core/queries/reactQuery';
import type { InterruptedTransfer } from 'src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer';

// brokerClient/ trusts Broker's responses, so the settings the component works from are checked here
const resourceConfigurationSchema = z.object({
  maxFileTransferSize: z.number().nullable(),
  fileTransferTimeToLive: z.string(),
  purgeFileTransferAfterAllRecipientsConfirmed: z.boolean(),
  purgeFileTransferGracePeriod: z.string(),
  requiredParty: z.string().nullable(),
  approvedForDisabledVirusScan: z.boolean(),
});

type ResourceConfiguration = z.infer<typeof resourceConfigurationSchema>;

export const brokerQueries = {
  all: ['brokerFileTransfer'] as const,
  resourceConfiguration: (baseUrl: string | undefined, resourceId: string): UseQueryOptions<ResourceConfiguration> => ({
    queryKey: [...brokerQueries.all, 'resourceConfiguration', baseUrl, resourceId],
    queryFn: baseUrl && resourceId ? () => fetchResourceConfiguration(baseUrl, resourceId) : skipToken,
    staleTime: 1000 * 60 * 10,
  }),
  interruptedTransfer: (baseUrl: string, fileTransferId: string | null): UseQueryOptions<InterruptedTransfer> => ({
    queryKey: [...brokerQueries.all, 'interruptedTransfer', baseUrl, fileTransferId],
    queryFn: fileTransferId
      ? ({ signal }) => {
          configureBrokerClient({ baseUrl });
          return checkInterruptedTransfer(fileTransferId, signal);
        }
      : skipToken,
    staleTime: 0,
    gcTime: 0,
  }),
};

export async function fetchResourceConfiguration(baseUrl: string, resourceId: string): Promise<ResourceConfiguration> {
  configureBrokerClient({ baseUrl });
  return resourceConfigurationSchema.parse(await getResourceConfiguration(resourceId));
}

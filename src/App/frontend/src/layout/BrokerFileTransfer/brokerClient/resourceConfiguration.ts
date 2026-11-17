import { apiFetch } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { BROKER_API_PREFIX } from 'src/layout/BrokerFileTransfer/brokerClient/config';

const RESOURCE_PATH = `${BROKER_API_PREFIX}/resource`;

export const VIRUS_SCAN_MAX_SIZE_BYTES = 50 * 1000 * 1000 * 1000;

export type ResourceConfiguration = {
  maxFileTransferSize: number | null;
  fileTransferTimeToLive: string;
  purgeFileTransferAfterAllRecipientsConfirmed: boolean;
  purgeFileTransferGracePeriod: string;
  requiredParty: string | null;
  approvedForDisabledVirusScan: boolean;
};

type ResourceConfigurationBody = {
  [K in keyof ResourceConfiguration]?: ResourceConfiguration[K] | null;
};

const DEFAULTS: ResourceConfiguration = {
  maxFileTransferSize: null,
  fileTransferTimeToLive: '30.00:00:00',
  purgeFileTransferAfterAllRecipientsConfirmed: true,
  purgeFileTransferGracePeriod: '02:00:00',
  requiredParty: null,
  approvedForDisabledVirusScan: false,
};

export function effectiveMaxFileTransferSize(configured: number | null, useVirusScan: boolean): number | null {
  if (!useVirusScan) {
    return configured;
  }

  return configured === null ? VIRUS_SCAN_MAX_SIZE_BYTES : Math.min(configured, VIRUS_SCAN_MAX_SIZE_BYTES);
}

export async function getResourceConfiguration(resourceId: string): Promise<ResourceConfiguration> {
  const body = await apiFetch<ResourceConfigurationBody>(`${RESOURCE_PATH}/${encodeURIComponent(resourceId)}`, {
    redirectOnUnauthorized: false,
  });

  return {
    maxFileTransferSize: body.maxFileTransferSize ?? DEFAULTS.maxFileTransferSize,
    fileTransferTimeToLive: body.fileTransferTimeToLive ?? DEFAULTS.fileTransferTimeToLive,
    purgeFileTransferAfterAllRecipientsConfirmed:
      body.purgeFileTransferAfterAllRecipientsConfirmed ?? DEFAULTS.purgeFileTransferAfterAllRecipientsConfirmed,
    purgeFileTransferGracePeriod: body.purgeFileTransferGracePeriod ?? DEFAULTS.purgeFileTransferGracePeriod,
    requiredParty: body.requiredParty || DEFAULTS.requiredParty,
    approvedForDisabledVirusScan: body.approvedForDisabledVirusScan ?? DEFAULTS.approvedForDisabledVirusScan,
  };
}

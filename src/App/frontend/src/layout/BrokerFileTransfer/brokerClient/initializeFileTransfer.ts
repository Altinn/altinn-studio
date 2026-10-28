import { apiFetch } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { BROKER_API_PREFIX } from 'src/layout/BrokerFileTransfer/brokerClient/config';
import { requireOrgIdentifier } from 'src/layout/BrokerFileTransfer/brokerClient/orgIdentifier';

const FILE_TRANSFER_PATH = `${BROKER_API_PREFIX}/filetransfer`;

export type InitializeFileTransferInput = {
  resourceId: string;
  sender: string;
  recipients: string[];
  file: File;
  reference?: string;
  propertyList?: Record<string, string>;
  disableVirusScan?: boolean;
};

export async function initializeFileTransfer(
  input: InitializeFileTransferInput,
  signal?: AbortSignal,
): Promise<string> {
  const response = await apiFetch<{ fileTransferId: string }>(FILE_TRANSFER_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(input)),
    signal,
  });

  return response.fileTransferId;
}

function buildRequestBody(input: InitializeFileTransferInput): FileTransferInitializeRequestBody {
  return {
    fileName: input.file.name,
    resourceId: input.resourceId.trim(),
    sender: requireOrgIdentifier(input.sender),
    recipients: input.recipients.map((recipient) => requireOrgIdentifier(recipient)),
    sendersFileTransferReference: input.reference?.trim() || undefined,
    propertyList: input.propertyList ?? {},
    disableVirusScan: input.disableVirusScan ?? false,
  };
}

type FileTransferInitializeRequestBody = {
  fileName: string;
  resourceId: string;
  sender: string;
  recipients: string[];
  sendersFileTransferReference?: string;
  propertyList?: Record<string, string>;
  checksum?: string;
  disableVirusScan?: boolean;
};

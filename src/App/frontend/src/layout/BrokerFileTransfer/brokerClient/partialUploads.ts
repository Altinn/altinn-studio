import { apiFetch } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { BROKER_API_PREFIX } from 'src/layout/BrokerFileTransfer/brokerClient/config';

export type PartialUpload = {
  partialUploadId: string;
  uploadLength: number;
};

// In the order they were created, which is their order in the file
export async function getPartialUploads(fileTransferId: string, signal?: AbortSignal): Promise<PartialUpload[]> {
  const response = await apiFetch<{ partialUploads: PartialUpload[] }>(
    `${BROKER_API_PREFIX}/filetransfer/${fileTransferId}/partialuploads`,
    { signal },
  );

  return response.partialUploads;
}

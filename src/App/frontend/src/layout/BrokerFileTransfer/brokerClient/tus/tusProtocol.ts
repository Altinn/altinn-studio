import { ApiError, apiRequest, readBody } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { apiUrl, BROKER_API_PREFIX } from 'src/layout/BrokerFileTransfer/brokerClient/config';

const TUS_PATH = `${BROKER_API_PREFIX}/filetransfer/upload/tus`;
const TUS_HEADERS = { 'Tus-Resumable': '1.0.0' };

export const RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000, 15000, 15000];

export function tusUploadPath(fileTransferId: string): string {
  return `${TUS_PATH}/${fileTransferId}`;
}

export function partialUploadPath(fileTransferId: string, partialUploadId: string): string {
  return `${tusUploadPath(fileTransferId)}/partial/${partialUploadId}`;
}

export async function createUpload(fileTransferId: string, length: number, signal?: AbortSignal): Promise<string> {
  const path = tusUploadPath(fileTransferId);
  const response = await send('POST', path, { 'Upload-Length': String(length) }, signal);

  await assertCreated(response);
  return locationPath(response, path);
}

// Must be called in order: the order of creation decides each part's place in the file
export async function createPartialUpload(
  fileTransferId: string,
  length: number,
  signal?: AbortSignal,
): Promise<string> {
  const response = await send(
    'POST',
    tusUploadPath(fileTransferId),
    { 'Upload-Length': String(length), 'Upload-Concat': 'partial' },
    signal,
  );

  await assertCreated(response);
  return locationPath(response);
}

export async function concatenateUploads(
  fileTransferId: string,
  partPaths: string[],
  signal?: AbortSignal,
  onAttempt?: () => void,
): Promise<void> {
  const parts = partPaths.map((path) => apiUrl(path)).join(' ');
  const response = await send(
    'POST',
    tusUploadPath(fileTransferId),
    { 'Upload-Concat': `final;${parts}` },
    signal,
    onAttempt,
  );

  await assertCreated(response);
}

export async function getUploadOffset(path: string, signal?: AbortSignal): Promise<number | null> {
  const response = await headUpload(path, signal);
  return response && readByteCount(response, 'Upload-Offset');
}

export async function getUploadLength(path: string, signal?: AbortSignal): Promise<number | null> {
  const response = await headUpload(path, signal);
  return response && readByteCount(response, 'Upload-Length');
}

// null when the upload is gone
async function headUpload(path: string, signal?: AbortSignal): Promise<Response | null> {
  const response = await send('HEAD', path, {}, signal);

  if (isGone(response.status)) {
    return null;
  }
  if (response.status !== 200) {
    throw new ApiError(`${response.status} on ${response.url}`, response.status);
  }

  return response;
}

function readByteCount(response: Response, header: 'Upload-Offset' | 'Upload-Length'): number {
  const count = Number(response.headers.get(header) || Number.NaN);
  if (!Number.isFinite(count)) {
    throw new ApiError(`The upload did not report its ${header}`, response.status);
  }

  return count;
}

export function isGone(status: number): boolean {
  return status === 404 || status === 409 || status === 410;
}

export function isTemporary(status: number): boolean {
  return status === 423 || status >= 500;
}

// Retrying a POST is safe here: a repeated create leaves an unused upload, and a repeated join gets a 409
async function send(
  method: 'HEAD' | 'POST',
  path: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
  onAttempt?: () => void,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const lastTry = attempt >= RETRY_DELAYS.length;
    onAttempt?.();
    try {
      const response = await apiRequest(path, {
        method,
        headers: { ...TUS_HEADERS, ...headers },
        signal,
      });
      if (lastTry || !isTemporary(response.status)) {
        return response;
      }
    } catch (error) {
      // fetch throws a TypeError when the connection drops
      if (lastTry || !(error instanceof TypeError)) {
        throw error;
      }
    }
    await delay(RETRY_DELAYS[attempt], signal);
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function assertCreated(response: Response): Promise<void> {
  if (response.status === 201) {
    return;
  }

  throw new ApiError(`${response.status} on ${response.url}`, response.status, await readBody(response));
}

function locationPath(response: Response, fallback?: string): string {
  const location = response.headers.get('Location');
  if (!location) {
    if (fallback) {
      return fallback;
    }
    throw new ApiError('The created upload has no location', response.status);
  }

  return location.startsWith('http') ? new URL(location).pathname : location;
}

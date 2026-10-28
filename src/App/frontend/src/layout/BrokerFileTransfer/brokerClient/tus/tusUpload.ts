import {
  DefaultHttpStack,
  DetailedError,
  type HttpRequest,
  type HttpResponse,
  Upload,
  type UploadOptions,
} from 'tus-js-client';

import { ApiError } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { apiUrl, redirectIfSessionEnded } from 'src/layout/BrokerFileTransfer/brokerClient/config';
import { getPartialUploads } from 'src/layout/BrokerFileTransfer/brokerClient/partialUploads';
import {
  concatenateUploads,
  createPartialUpload,
  createUpload,
  getUploadLength,
  getUploadOffset,
  isGone,
  isTemporary,
  partialUploadPath,
  RETRY_DELAYS,
  tusUploadPath,
} from 'src/layout/BrokerFileTransfer/brokerClient/tus/tusProtocol';

const MAX_PARALLEL_PARTS = 6;
const MIN_PART_SIZE = 64 * 1024 * 1024;
const MIN_CHUNK_SIZE = 8 * 1024 * 1024;
// Each chunk becomes one Azure block, and a part takes at most 50,000 of them
const CHUNKS_PER_PART_BUDGET = 40_000;

const STALL_TIMEOUT_MS = 120_000;
const PROGRESS_INTERVAL_MS = 200;
const SPEED_WINDOW_MS = 3000;

export type UploadPart = {
  path: string;
  start: number;
  length: number;
};

export type UploadPlan = {
  fileTransferId: string;
  parts: UploadPart[];
};

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
  bytesPerSecond: number | null;
  secondsRemaining: number | null;
};

export type UploadRunStatus = 'uploading' | 'pausing' | 'paused' | 'finishing';

export type StartUploadOptions = {
  onProgress?: (progress: UploadProgress) => void;
  onStatus?: (status: UploadRunStatus) => void;
  alreadySent?: number;
  paused?: boolean;
};

export type UploadRun = {
  finished: Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  abort: () => void;
};

export class UploadGoneError extends ApiError {
  constructor(message: string, status: number, body?: unknown) {
    super(message, status, body);
    this.name = 'UploadGoneError';
  }
}

export class FileChangedError extends Error {
  constructor() {
    super('The file was changed after it was picked');
    this.name = 'FileChangedError';
  }
}

export async function assertFileUnchanged(file: Blob): Promise<void> {
  try {
    await file.slice(0, 1).arrayBuffer();
  } catch {
    throw new FileChangedError();
  }
}

export async function createUploadPlan(fileTransferId: string, file: File, signal?: AbortSignal): Promise<UploadPlan> {
  const ranges = splitIntoParts(file.size);

  if (ranges.length === 1) {
    const path = await createUpload(fileTransferId, file.size, signal);
    return { fileTransferId, parts: [{ path, ...ranges[0] }] };
  }

  const parts: UploadPart[] = [];
  try {
    for (const range of ranges) {
      const path = await createPartialUpload(fileTransferId, range.length, signal);
      parts.push({ path, ...range });
    }
  } catch (error) {
    discardUpload({ fileTransferId, parts });
    throw error;
  }

  return { fileTransferId, parts };
}

export async function findUploadPlan(fileTransferId: string, signal?: AbortSignal): Promise<UploadPlan | null> {
  const partialUploads = await getPartialUploads(fileTransferId, signal).catch((error: unknown) => {
    // A Broker without the endpoint can't list the parts, so a file sent in parts starts over
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  });
  if (partialUploads.length > 0) {
    let start = 0;
    const parts = partialUploads.map(({ partialUploadId, uploadLength }) => {
      const part = { path: partialUploadPath(fileTransferId, partialUploadId), start, length: uploadLength };
      start += uploadLength;
      return part;
    });
    return { fileTransferId, parts };
  }

  const path = tusUploadPath(fileTransferId);
  const length = await getUploadLength(path, signal);
  return length === null ? null : { fileTransferId, parts: [{ path, start: 0, length }] };
}

export function planSize(plan: UploadPlan): number {
  return plan.parts.reduce((size, part) => size + part.length, 0);
}

export function startUpload(
  plan: UploadPlan,
  file: File,
  { onProgress, onStatus, alreadySent = 0, paused: startPaused = false }: StartUploadOptions = {},
): UploadRun {
  const concatenated = plan.parts.length > 1;
  const sentPerPart: (number | null)[] = plan.parts.map(() => null);
  let partsDone = 0;
  let paused = false;
  let allSent = false;
  let settled = false;
  let failure: Error | undefined;
  let reported: UploadRunStatus | null = null;

  const progress = trackProgress(file.size, alreadySent, onProgress);
  const transport = pausableHttpStack(report);
  const concatenation = new AbortController();
  const watchdog = stallWatchdog(STALL_TIMEOUT_MS, () => {
    if (paused && !transport.isSending()) {
      watchdog.keepAlive();
      return;
    }
    abortParts();
    finish(failure ?? new ApiError('The upload stopped responding', 0));
  });

  let settle: (error?: Error) => void = () => {};
  const finished = new Promise<void>((resolve, reject) => {
    settle = (error) => (error ? reject(error) : resolve());
  });

  function status(): UploadRunStatus {
    if (paused) {
      return transport.isSending() ? 'pausing' : 'paused';
    }
    return allSent ? 'finishing' : 'uploading';
  }

  function report() {
    const current = status();
    if (!settled && current !== reported) {
      reported = current;
      progress.show();
      onStatus?.(current);
    }
  }

  function finish(error?: Error) {
    if (settled) {
      return;
    }
    settled = true;
    void transport.stop();
    concatenation.abort();
    watchdog.clear();
    settle(error);
  }

  // No endpoint, so a part that is gone fails instead of being recreated
  const uploads = plan.parts.map(
    (part, index) =>
      new Upload(file.slice(part.start, part.start + part.length), {
        ...transportOptions(),
        uploadUrl: apiUrl(part.path),
        chunkSize: chunkSizeFor(plan),
        retryDelays: RETRY_DELAYS,
        httpStack: transport,
        storeFingerprintForResuming: false,
        onAfterResponse: (_request, response) => {
          if (response.getStatus() < 400) {
            watchdog.keepAlive();
          }
        },
        onShouldRetry: (error) => {
          if (!error.originalResponse) {
            void assertFileUnchanged(file).catch(fail);
          }
          return shouldRetry(error);
        },
        onProgress: (sent) => {
          if (settled) {
            return;
          }
          if (sentPerPart[index] === null) {
            progress.restartRate();
          }
          sentPerPart[index] = sent;
          const total = sentPerPart.reduce<number>((sum, bytes) => sum + (bytes ?? 0), 0);
          watchdog.keepAlive();
          progress.report(total);
          allSent = concatenated && total >= file.size;
          report();
        },
        onSuccess: () => {
          partsDone++;
          if (partsDone === plan.parts.length) {
            complete();
          }
        },
        onError: (error) => fail(asApiError(error)),
      }),
  );

  // Waits for the other parts, so the next run doesn't collide with them on the server's upload locks
  function fail(error: Error) {
    failure ??= error;
    void transport.stop().then(() => finish(failure));
  }

  function complete() {
    if (!concatenated) {
      finish();
      return;
    }
    paused = false;
    report();
    const paths = plan.parts.map((part) => part.path);
    concatenateUploads(plan.fileTransferId, paths, concatenation.signal, watchdog.keepAlive).then(
      () => finish(),
      (error: Error) =>
        finish(
          error instanceof ApiError && isGone(error.status)
            ? new UploadGoneError(error.message, error.status, error.body)
            : error,
        ),
    );
  }

  function abortParts() {
    for (const upload of uploads) {
      void upload.abort();
    }
  }

  function pause() {
    if (partsDone === plan.parts.length) {
      return;
    }
    paused = true;
    transport.hold();
    report();
  }

  if (startPaused) {
    pause();
  } else {
    report();
  }
  watchdog.keepAlive();
  for (const upload of uploads) {
    upload.start();
  }

  return {
    finished,
    pause,
    async resume() {
      if (settled || !paused) {
        return;
      }
      paused = false;
      watchdog.keepAlive();
      progress.restartRate();
      report();
      if (await redirectIfSessionEnded()) {
        return;
      }
      if (!paused) {
        transport.release();
      }
    },
    abort() {
      abortParts();
      finish(abortError());
    },
  };
}

export async function readUploadedBytes(plan: UploadPlan, signal?: AbortSignal): Promise<number | null> {
  const offsets = await Promise.all(plan.parts.map((part) => getUploadOffset(part.path, signal)));

  return offsets.reduce<number | null>((total, offset, index) => {
    if (total === null || offset === null) {
      return null;
    }
    return total + Math.min(offset, plan.parts[index].length);
  }, 0);
}

export function discardUpload(plan: UploadPlan): void {
  for (const part of plan.parts) {
    const options = { ...transportOptions(), retryDelays: RETRY_DELAYS };
    Upload.terminate(apiUrl(part.path), options).catch(() => undefined);
  }
}

export function isUploadGone(error: unknown): boolean {
  return error instanceof UploadGoneError;
}

function splitIntoParts(size: number): { start: number; length: number }[] {
  const count = Math.min(MAX_PARALLEL_PARTS, Math.floor(size / MIN_PART_SIZE));
  if (count < 2) {
    return [{ start: 0, length: size }];
  }

  const partSize = Math.ceil(size / count);
  return Array.from({ length: count }, (_, index) => {
    const start = index * partSize;
    return { start, length: Math.min(partSize, size - start) };
  });
}

function trackProgress(total: number, alreadySent: number, onProgress?: (progress: UploadProgress) => void) {
  let reportedAt = 0;
  let rateWindow: { at: number; loaded: number } | null = null;
  let bytesPerSecond: number | null = null;
  let loaded = alreadySent;

  function emit() {
    onProgress?.({
      loaded,
      total,
      percent: total > 0 ? Math.min(100, Math.floor((loaded / total) * 100)) : 100,
      bytesPerSecond,
      secondsRemaining: bytesPerSecond !== null && bytesPerSecond > 0 ? (total - loaded) / bytesPerSecond : null,
    });
  }

  return {
    report(sent: number) {
      loaded = Math.max(loaded, sent);
      const now = performance.now();
      if (now - reportedAt < PROGRESS_INTERVAL_MS) {
        return;
      }
      reportedAt = now;

      rateWindow ??= { at: now, loaded };
      const elapsed = now - rateWindow.at;
      if (elapsed >= SPEED_WINDOW_MS) {
        bytesPerSecond = ((loaded - rateWindow.loaded) * 1000) / elapsed;
        rateWindow = { at: now, loaded };
      }
      emit();
    },
    restartRate() {
      rateWindow = null;
      bytesPerSecond = null;
      emit();
    },
    show: emit,
  };
}

// tus-js-client can't pause, so requests are held here; aborting them would leave the server holding locks
function pausableHttpStack(onRequestDone: () => void) {
  const stack = new DefaultHttpStack({});
  const inFlight = new Set<Promise<HttpResponse>>();
  let held: Promise<void> | null = null;
  let letThrough = () => {};
  let stopped = false;

  const hold = () => {
    held ??= new Promise((resolve) => (letThrough = resolve));
  };

  return {
    getName: () => 'PausableHttpStack',
    createRequest(method: string, url: string): HttpRequest {
      const request = stack.createRequest(method, url);
      const send = request.send.bind(request);
      request.send = async (body: unknown) => {
        while (held) {
          await held;
        }
        const response = send(body);
        const forget = () => {
          inFlight.delete(response);
          onRequestDone();
        };
        inFlight.add(response);
        response.then(forget, forget);
        return response;
      };
      return request;
    },
    isSending: () => inFlight.size > 0,
    hold,
    release() {
      if (!stopped) {
        letThrough();
        held = null;
      }
    },
    async stop() {
      stopped = true;
      hold();
      await Promise.allSettled(inFlight);
    },
  };
}

function stallWatchdog(timeoutMs: number, onStall: () => void) {
  let timer: ReturnType<typeof setTimeout>;

  return {
    keepAlive() {
      clearTimeout(timer);
      timer = setTimeout(onStall, timeoutMs);
    },
    clear() {
      clearTimeout(timer);
    },
  };
}

function transportOptions(): UploadOptions {
  return {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    onBeforeRequest: (request) => {
      const xhr = request.getUnderlyingObject() as XMLHttpRequest;
      xhr.withCredentials = true;
    },
    onShouldRetry: shouldRetry,
  };
}

function shouldRetry(error: DetailedError): boolean {
  const status = error.originalResponse?.getStatus() ?? 0;

  if (status === 401) {
    void redirectIfSessionEnded();
    return false;
  }

  // On a PATCH, 409 is an offset mismatch the next HEAD resolves; elsewhere Broker no longer takes uploads
  if (status === 409) {
    return error.originalRequest?.getMethod() === 'PATCH';
  }

  return status === 0 || isTemporary(status);
}

function chunkSizeFor(plan: UploadPlan): number {
  const longest = Math.max(...plan.parts.map((part) => part.length));
  return Math.max(MIN_CHUNK_SIZE, Math.ceil(longest / CHUNKS_PER_PART_BUDGET));
}

function asApiError(error: Error): Error {
  if (!(error instanceof DetailedError)) {
    return error;
  }

  const response = error.originalResponse;
  const status = response?.getStatus() ?? 0;
  const body = response?.getBody();
  return isGone(status) && !shouldRetry(error)
    ? new UploadGoneError(error.message, status, body)
    : new ApiError(error.message, status, body);
}

function abortError(): DOMException {
  return new DOMException('Upload aborted', 'AbortError');
}

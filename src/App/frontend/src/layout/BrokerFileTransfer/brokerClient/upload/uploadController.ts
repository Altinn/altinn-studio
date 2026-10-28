import {
  CREATED_STATUS,
  hasReceivedFile,
  UPLOADED_STATUS,
} from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import {
  initializeFileTransfer,
  type InitializeFileTransferInput,
} from 'src/layout/BrokerFileTransfer/brokerClient/initializeFileTransfer';
import {
  assertFileUnchanged,
  createUploadPlan,
  discardUpload,
  isUploadGone,
  startUpload,
  type UploadPlan,
  type UploadProgress,
  type UploadRun,
  type UploadRunStatus,
} from 'src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload';

export type UploadStatus = 'initializing' | UploadRunStatus | 'failed';

export type ActiveUpload = {
  resourceId: string;
  sender: string;
  fileName: string;
  fileSize: number;
  status: UploadStatus;
  error: unknown;
};

export type StartUploadInput = InitializeFileTransferInput;

export type ContinueTransferInput = {
  resourceId: string;
  sender: string;
  fileTransferId: string;
  file: File;
  // What Broker already holds of the file; without uploaded, the upload starts over
  plan: UploadPlan | null;
  uploaded: number | null;
};

export type PlannedUpload = {
  resourceId: string;
  sender: string;
  plan: UploadPlan;
  file: File;
};

export type FileTransfer = {
  resourceId: string;
  sender: string;
  fileTransferId: string;
  fileName: string;
};

// What the form should record about the latest file transfer
export type TransferRecord = FileTransfer & {
  // Broker's status for the transfer, or null once it is given up
  status: string | null;
};

export type UploadControllerOptions = {
  onFailed?: (error: unknown) => void;
};

export type UploadController = {
  start: (input: StartUploadInput) => Promise<void>;
  continueTransfer: (input: ContinueTransferInput) => Promise<void>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  discard: (transfer: FileTransfer, plan: UploadPlan | null) => void;
  markReceived: (transfer: FileTransfer, status: string) => void;
  subscribe: (listener: () => void) => () => void;
  getActive: () => ActiveUpload | null;
  getProgress: () => UploadProgress | null;
  getTransfer: () => TransferRecord | null;
};

export class UploadPlanError extends Error {
  readonly fileTransferId: string;

  constructor(fileTransferId: string, cause: unknown) {
    super('The upload could not be prepared', { cause });
    this.name = 'UploadPlanError';
    this.fileTransferId = fileTransferId;
  }
}

type Initializing = { phase: 'initializing'; controller: AbortController; paused: boolean; transfer?: FileTransfer };
type Running = { phase: 'running'; upload: PlannedUpload; run: UploadRun };
type Failed = { phase: 'failed'; upload: PlannedUpload; loaded: number };

export function createUploadController({ onFailed }: UploadControllerOptions = {}): UploadController {
  let active: ActiveUpload | null = null;
  let progress: UploadProgress | null = null;
  let transfer: TransferRecord | null = null;
  let session: Initializing | Running | Failed | null = null;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function show(upload: ActiveUpload | null) {
    active = upload;
    progress = null;
    notify();
  }

  function update(changes: Partial<ActiveUpload>) {
    if (active) {
      active = { ...active, ...changes };
      notify();
    }
  }

  function record(next: TransferRecord) {
    transfer = next;
    notify();
  }

  const markReceived: UploadController['markReceived'] = (received, status) => record({ ...received, status });

  const discard: UploadController['discard'] = (given, plan) => {
    if (plan) {
      discardUpload(plan);
    }
    record({ ...given, status: null });
  };

  async function run(upload: PlannedUpload, alreadySent: number, paused = false) {
    update({ error: null });

    let loaded = alreadySent;
    const current: Running = {
      phase: 'running',
      upload,
      run: startUpload(upload.plan, upload.file, {
        onProgress: (next) => {
          loaded = next.loaded;
          progress = next;
          notify();
        },
        onStatus: (status) => update({ status }),
        alreadySent,
        paused,
      }),
    };
    session = current;

    try {
      await fileReceived(upload.plan, current.run);
    } catch (error) {
      if (isAbortError(error) || session !== current) {
        return;
      }
      if (isUploadGone(error)) {
        session = null;
        show(null);
        discard(fileTransferOf(upload), upload.plan);
      } else {
        session = { phase: 'failed', upload, loaded };
        update({ status: 'failed', error });
      }
      onFailed?.(error);
      return;
    }

    if (session !== current) {
      return;
    }
    session = null;
    show(null);
    markReceived(fileTransferOf(upload), UPLOADED_STATUS);
  }

  function beginInitializing(upload: { resourceId: string; sender: string; file: File }): Initializing | null {
    if (session) {
      return null;
    }
    const current: Initializing = { phase: 'initializing', controller: new AbortController(), paused: false };
    session = current;
    show(newActiveUpload(upload, 'initializing'));
    return current;
  }

  // Passes the error on, unless the upload was cancelled meanwhile
  function stopInitializing(current: Initializing, error: unknown) {
    if (session === current) {
      session = null;
      show(null);
      throw error;
    }
  }

  async function planAndRun(current: Initializing, given: FileTransfer, file: File) {
    let plan: UploadPlan;
    try {
      plan = await createUploadPlan(given.fileTransferId, file, current.controller.signal);
    } catch (error) {
      stopInitializing(current, new UploadPlanError(given.fileTransferId, error));
      return;
    }

    if (session !== current) {
      discardUpload(plan);
      return;
    }
    await run({ resourceId: given.resourceId, sender: given.sender, plan, file }, 0, current.paused);
  }

  async function start(input: StartUploadInput) {
    const current = beginInitializing(input);
    if (!current) {
      return;
    }

    let fileTransferId: string;
    try {
      await assertFileUnchanged(input.file);
      fileTransferId = await initializeFileTransfer(input, current.controller.signal);
    } catch (error) {
      stopInitializing(current, error);
      return;
    }

    if (session !== current) {
      return;
    }
    current.transfer = {
      resourceId: input.resourceId,
      sender: input.sender,
      fileTransferId,
      fileName: input.file.name,
    };
    record({ ...current.transfer, status: CREATED_STATUS });
    await planAndRun(current, current.transfer, input.file);
  }

  async function continueTransfer({ plan, uploaded, file, ...given }: ContinueTransferInput) {
    if (session) {
      return;
    }
    if (plan && uploaded !== null) {
      show(newActiveUpload({ ...given, file }, 'uploading'));
      await run({ resourceId: given.resourceId, sender: given.sender, plan, file }, uploaded);
      return;
    }
    if (plan) {
      discardUpload(plan);
    }

    const current = beginInitializing({ ...given, file });
    if (!current) {
      return;
    }
    current.transfer = { ...given, fileName: file.name };
    try {
      await assertFileUnchanged(file);
    } catch (error) {
      stopInitializing(current, error);
      return;
    }
    await planAndRun(current, current.transfer, file);
  }

  function pause() {
    if (session?.phase === 'running') {
      session.run.pause();
    } else if (session?.phase === 'initializing') {
      session.paused = true;
    }
  }

  function resume() {
    if (session?.phase === 'running') {
      void session.run.resume();
    } else if (session?.phase === 'failed') {
      void run(session.upload, session.loaded);
    } else if (session?.phase === 'initializing') {
      session.paused = false;
    }
  }

  function cancel() {
    const cancelled = session;
    session = null;
    show(null);
    if (cancelled?.phase === 'initializing') {
      cancelled.controller.abort();
      if (cancelled.transfer) {
        discard(cancelled.transfer, null);
      }
      return;
    }
    if (cancelled?.phase === 'running') {
      cancelled.run.abort();
    }
    if (cancelled) {
      discard(fileTransferOf(cancelled.upload), cancelled.upload.plan);
    }
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    start,
    continueTransfer,
    pause,
    resume,
    cancel,
    discard,
    markReceived,
    subscribe,
    getActive: () => active,
    getProgress: () => progress,
    getTransfer: () => transfer,
  };
}

// A rejected upload whose file the server already has only lost its response
async function fileReceived(plan: UploadPlan, run: UploadRun): Promise<void> {
  try {
    await run.finished;
  } catch (error) {
    if (!isUploadGone(error) || !(await hasReceivedFile(plan.fileTransferId))) {
      throw error;
    }
  }
}

function fileTransferOf({ resourceId, sender, plan, file }: PlannedUpload): FileTransfer {
  return { resourceId, sender, fileTransferId: plan.fileTransferId, fileName: file.name };
}

function newActiveUpload(
  { resourceId, sender, file }: { resourceId: string; sender: string; file: File },
  status: UploadStatus,
): ActiveUpload {
  return {
    resourceId,
    sender,
    fileName: file.name,
    fileSize: file.size,
    status,
    error: null,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

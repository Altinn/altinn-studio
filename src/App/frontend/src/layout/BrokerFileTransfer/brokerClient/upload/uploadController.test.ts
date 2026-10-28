import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { hasReceivedFile } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import { initializeFileTransfer } from 'src/layout/BrokerFileTransfer/brokerClient/initializeFileTransfer';
import {
  createUploadPlan,
  discardUpload,
  startUpload,
  type StartUploadOptions,
  UploadGoneError,
  type UploadPlan,
} from 'src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload';
import {
  createUploadController,
  UploadPlanError,
} from 'src/layout/BrokerFileTransfer/brokerClient/upload/uploadController';

vi.mock('src/layout/BrokerFileTransfer/brokerClient/initializeFileTransfer', () => ({
  initializeFileTransfer: vi.fn(),
}));
vi.mock('src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus')>()),
  hasReceivedFile: vi.fn(),
}));
vi.mock('src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload')>()),
  assertFileUnchanged: vi.fn(async () => undefined),
  createUploadPlan: vi.fn(),
  discardUpload: vi.fn(),
  startUpload: vi.fn(),
}));

const file = new File(['abc'], 'report.pdf');
const plan: UploadPlan = { fileTransferId: 'transfer-1', parts: [{ path: '/tus/transfer-1', start: 0, length: 3 }] };
const input = { resourceId: 'resource', sender: '912345678', recipients: ['987654321'], file };
const transfer = { resourceId: 'resource', sender: '912345678', fileTransferId: 'transfer-1', fileName: 'report.pdf' };

function fakeRun() {
  let resolve = () => {};
  let reject: (error: unknown) => void = () => {};
  const finished = new Promise<void>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  const run = {
    finished,
    pause: vi.fn(),
    resume: vi.fn(async () => undefined),
    abort: vi.fn(() => reject(new DOMException('Upload aborted', 'AbortError'))),
  };
  return { run, resolve, reject };
}

function setUp() {
  const onFailed = vi.fn();
  const controller = createUploadController({ onFailed });
  return { controller, onFailed };
}

function lastRunOptions(): StartUploadOptions {
  return vi.mocked(startUpload).mock.lastCall![2]!;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(initializeFileTransfer).mockResolvedValue('transfer-1');
  vi.mocked(createUploadPlan).mockResolvedValue(plan);
});

describe('createUploadController', () => {
  it('records the transfer as soon as Broker creates it, and again once Broker has the file', async () => {
    const { controller } = setUp();
    const upload = fakeRun();
    vi.mocked(startUpload).mockReturnValue(upload.run);

    const started = controller.start(input);
    expect(controller.getActive()).toMatchObject({ fileName: 'report.pdf', status: 'initializing' });

    await vi.waitFor(() => expect(startUpload).toHaveBeenCalledOnce());
    expect(controller.getTransfer()).toEqual({ ...transfer, status: 'Initialized' });
    lastRunOptions().onStatus?.('uploading');
    expect(controller.getActive()?.status).toBe('uploading');

    upload.resolve();
    await started;

    expect(controller.getActive()).toBeNull();
    expect(controller.getTransfer()).toEqual({ ...transfer, status: 'UploadProcessing' });
  });

  it('tells subscribers when something changes', async () => {
    const { controller } = setUp();
    vi.mocked(startUpload).mockReturnValue(fakeRun().run);
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    void controller.start(input);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    controller.cancel();
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps a failed upload, and carries on from where it stopped', async () => {
    const { controller, onFailed } = setUp();
    const first = fakeRun();
    vi.mocked(startUpload).mockReturnValue(first.run);

    const started = controller.start(input);
    await vi.waitFor(() => expect(startUpload).toHaveBeenCalledOnce());
    lastRunOptions().onProgress?.({ loaded: 2, total: 3, percent: 66, bytesPerSecond: null, secondsRemaining: null });
    const error = new ApiError('Server error', 500);
    first.reject(error);
    await started;

    expect(controller.getActive()).toMatchObject({ status: 'failed', error });
    expect(onFailed).toHaveBeenCalledWith(error);
    expect(controller.getTransfer()?.status).toBe('Initialized');

    vi.mocked(startUpload).mockReturnValue(fakeRun().run);
    controller.resume();

    expect(startUpload).toHaveBeenCalledTimes(2);
    expect(lastRunOptions().alreadySent).toBe(2);
    expect(controller.getActive()?.error).toBeNull();
  });

  it('counts a rejected upload as received when the server already has the file', async () => {
    const { controller, onFailed } = setUp();
    const upload = fakeRun();
    vi.mocked(startUpload).mockReturnValue(upload.run);
    vi.mocked(hasReceivedFile).mockResolvedValue(true);

    const started = controller.start(input);
    await vi.waitFor(() => expect(startUpload).toHaveBeenCalledOnce());
    upload.reject(new UploadGoneError('Conflict', 409));
    await started;

    expect(controller.getTransfer()?.status).toBe('UploadProcessing');
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('gives up an upload that is gone from the server', async () => {
    const { controller, onFailed } = setUp();
    const upload = fakeRun();
    vi.mocked(startUpload).mockReturnValue(upload.run);
    vi.mocked(hasReceivedFile).mockResolvedValue(false);

    const started = controller.start(input);
    await vi.waitFor(() => expect(startUpload).toHaveBeenCalledOnce());
    const error = new UploadGoneError('Gone', 410);
    upload.reject(error);
    await started;

    expect(controller.getActive()).toBeNull();
    expect(discardUpload).toHaveBeenCalledWith(plan);
    expect(controller.getTransfer()).toEqual({ ...transfer, status: null });
    expect(onFailed).toHaveBeenCalledWith(error);
  });

  it('keeps the transfer when it was created but its upload could not be prepared', async () => {
    const { controller } = setUp();
    vi.mocked(createUploadPlan).mockRejectedValue(new ApiError('Server error', 500));

    const error = await controller.start(input).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UploadPlanError);
    expect(error).toMatchObject({ fileTransferId: 'transfer-1' });
    expect(controller.getActive()).toBeNull();
    expect(controller.getTransfer()).toEqual({ ...transfer, status: 'Initialized' });
  });

  it('cancels without reporting a failure, and gives up the transfer', async () => {
    const { controller, onFailed } = setUp();
    const upload = fakeRun();
    vi.mocked(startUpload).mockReturnValue(upload.run);

    const started = controller.start(input);
    await vi.waitFor(() => expect(startUpload).toHaveBeenCalledOnce());
    controller.cancel();
    await started;

    expect(upload.run.abort).toHaveBeenCalledOnce();
    expect(discardUpload).toHaveBeenCalledWith(plan);
    expect(controller.getTransfer()).toEqual({ ...transfer, status: null });
    expect(controller.getActive()).toBeNull();
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('gives up a transfer cancelled while its upload is being prepared', async () => {
    const { controller } = setUp();
    vi.mocked(createUploadPlan).mockReturnValue(new Promise(() => {}));

    void controller.start(input);
    await vi.waitFor(() => expect(createUploadPlan).toHaveBeenCalledOnce());
    controller.cancel();

    expect(controller.getTransfer()).toEqual({ ...transfer, status: null });
  });

  it('starts the upload paused when paused while the transfer was being created', async () => {
    const { controller } = setUp();
    vi.mocked(startUpload).mockReturnValue(fakeRun().run);

    void controller.start(input);
    controller.pause();

    await vi.waitFor(() => expect(startUpload).toHaveBeenCalledOnce());
    expect(lastRunOptions().paused).toBe(true);
  });

  it('runs one upload at a time', async () => {
    const { controller } = setUp();
    vi.mocked(startUpload).mockReturnValue(fakeRun().run);

    void controller.start(input);
    await controller.start({ ...input, resourceId: 'other' });

    expect(initializeFileTransfer).toHaveBeenCalledOnce();
    expect(controller.getActive()?.resourceId).toBe('resource');
  });

  it('continues an interrupted transfer from what Broker already holds', async () => {
    const { controller } = setUp();
    vi.mocked(startUpload).mockReturnValue(fakeRun().run);

    void controller.continueTransfer({ ...transfer, file, plan, uploaded: 2 });

    expect(startUpload).toHaveBeenCalledWith(plan, file, expect.objectContaining({ alreadySent: 2 }));
    expect(controller.getActive()).toMatchObject({ fileName: 'report.pdf', status: 'uploading' });
    expect(initializeFileTransfer).not.toHaveBeenCalled();
    expect(createUploadPlan).not.toHaveBeenCalled();
  });

  it('uploads an interrupted transfer from the start when Broker holds none of it', async () => {
    const { controller } = setUp();
    vi.mocked(startUpload).mockReturnValue(fakeRun().run);

    void controller.continueTransfer({ ...transfer, file, plan: null, uploaded: 0 });

    await vi.waitFor(() => expect(startUpload).toHaveBeenCalledOnce());
    expect(createUploadPlan).toHaveBeenCalledWith('transfer-1', file, expect.any(AbortSignal));
    expect(lastRunOptions().alreadySent).toBe(0);
    expect(initializeFileTransfer).not.toHaveBeenCalled();
  });

  it('starts an interrupted transfer over when part of its upload has expired', async () => {
    const { controller } = setUp();
    vi.mocked(startUpload).mockReturnValue(fakeRun().run);
    const expired: UploadPlan = { fileTransferId: 'transfer-1', parts: [{ path: '/tus/old', start: 0, length: 3 }] };

    void controller.continueTransfer({ ...transfer, file, plan: expired, uploaded: null });

    await vi.waitFor(() => expect(startUpload).toHaveBeenCalledOnce());
    expect(discardUpload).toHaveBeenCalledWith(expired);
    expect(vi.mocked(startUpload).mock.lastCall![0]).toBe(plan);
  });

  it('records what the form learns about a transfer it holds', () => {
    const { controller } = setUp();

    controller.markReceived(transfer, 'Published');
    expect(controller.getTransfer()).toEqual({ ...transfer, status: 'Published' });

    controller.discard(transfer, plan);
    expect(discardUpload).toHaveBeenCalledWith(plan);
    expect(controller.getTransfer()).toEqual({ ...transfer, status: null });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureBrokerClient } from 'src/layout/BrokerFileTransfer/brokerClient/config';
import {
  concatenateUploads,
  createUpload,
  getUploadLength,
  getUploadOffset,
} from 'src/layout/BrokerFileTransfer/brokerClient/tus/tusProtocol';

const fetchMock = vi.fn<typeof fetch>();
const TUS_PATH = '/broker/api/v1/filetransfer/upload/tus';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
  configureBrokerClient({ baseUrl: 'https://platform.example', redirectIfSessionEnded: async () => false });
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('createUpload', () => {
  it('answers with the path of the upload the server created', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 201, headers: { Location: `https://platform.example${TUS_PATH}/id` } }),
    );

    await expect(createUpload('id', 100)).resolves.toBe(`${TUS_PATH}/id`);
    const headers = new Headers(fetchMock.mock.calls[0][1]!.headers);
    expect(headers.get('Upload-Length')).toBe('100');
    expect(headers.get('Tus-Resumable')).toBe('1.0.0');
  });

  it('tries again while the server is locked or failing, and through a dropped connection', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 423 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 201, headers: { Location: `${TUS_PATH}/id` } }));

    const created = createUpload('id', 100);
    await vi.runAllTimersAsync();

    await expect(created).resolves.toBe(`${TUS_PATH}/id`);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not try again when the server refuses the upload', async () => {
    fetchMock.mockResolvedValue(Response.json({ detail: 'Too large' }, { status: 400 }));

    await expect(createUpload('id', 100)).rejects.toMatchObject({ status: 400, body: { detail: 'Too large' } });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe('getUploadOffset', () => {
  it('answers with the bytes the server holds', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200, headers: { 'Upload-Offset': '42' } }));

    await expect(getUploadOffset(`${TUS_PATH}/id`)).resolves.toBe(42);
  });

  it.each([404, 409, 410])('answers null when the upload is gone (%i)', async (status) => {
    fetchMock.mockResolvedValue(new Response(null, { status }));

    await expect(getUploadOffset(`${TUS_PATH}/id`)).resolves.toBeNull();
  });
});

describe('getUploadLength', () => {
  it('answers with the size the upload was created with', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 200, headers: { 'Upload-Offset': '42', 'Upload-Length': '100' } }),
    );

    await expect(getUploadLength(`${TUS_PATH}/id`)).resolves.toBe(100);
  });

  it('answers null when the upload is gone', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(getUploadLength(`${TUS_PATH}/id`)).resolves.toBeNull();
  });
});

describe('concatenateUploads', () => {
  it('joins the parts, in order, by their full urls', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));

    await concatenateUploads('id', [`${TUS_PATH}/id/partial/a`, `${TUS_PATH}/id/partial/b`]);

    const headers = new Headers(fetchMock.mock.calls[0][1]!.headers);
    expect(headers.get('Upload-Concat')).toBe(
      `final;https://platform.example${TUS_PATH}/id/partial/a https://platform.example${TUS_PATH}/id/partial/b`,
    );
  });
});

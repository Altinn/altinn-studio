import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlobDownloader } from './BlobDownloader';

describe('BlobDownloader', () => {
  const data = { test: 'test' };

  beforeEach(() => {
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a download url', () => {
    const blobDownloader = new BlobDownloader(JSON.stringify(data));
    blobDownloader.getDownloadURL();
    const testBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(testBlob);
  });

  it('should revoke a download url', () => {
    const blobDownloader = new BlobDownloader(JSON.stringify(data));
    const downloadUrl = blobDownloader.getDownloadURL();
    blobDownloader.revokeDownloadURL(downloadUrl);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(downloadUrl);
  });

  it('should generate a download url with a custom file type', () => {
    const fileType = 'application/pdf';
    const blobDownloaderWithFileType = new BlobDownloader(JSON.stringify(data), fileType);
    blobDownloaderWithFileType.getDownloadURL();
    const testBlob = new Blob([JSON.stringify(data)], { type: fileType });
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(testBlob);
  });

  it('should handle clicking the download link', () => {
    const blobDownloader = new BlobDownloader(JSON.stringify(data));
    const mockGetDownloadURL = vi.fn();
    const mockGetRevokeDownloadURL = vi.fn();
    vi.spyOn(blobDownloader, 'getDownloadURL').mockImplementation(mockGetDownloadURL);
    vi.spyOn(blobDownloader, 'revokeDownloadURL').mockImplementation(mockGetRevokeDownloadURL);
    blobDownloader.handleDownloadClick();
    expect(mockGetDownloadURL).toHaveBeenCalled();
    expect(mockGetRevokeDownloadURL).toHaveBeenCalled();
  });
});

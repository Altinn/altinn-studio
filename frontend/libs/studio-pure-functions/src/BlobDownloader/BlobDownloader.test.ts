import { BlobDownloader } from './BlobDownloader';

describe('BlobDownloader', () => {
  const data = { test: 'test' };
  const blobDownloader = new BlobDownloader(JSON.stringify(data));
  global.URL.createObjectURL = jest.fn();
  global.URL.revokeObjectURL = jest.fn();

  it('should generate a download url', () => {
    blobDownloader.getDownloadURL();
    const testBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(testBlob);
  });

  it('should revoke a download url', () => {
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
});

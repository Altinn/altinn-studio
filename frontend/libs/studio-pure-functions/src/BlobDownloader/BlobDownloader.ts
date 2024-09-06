export class BlobDownloader {
  private readonly data: string;
  private readonly fileType: string;
  private readonly fileName: string;

  constructor(data: string, fileType = 'application/json', fileName = 'data.json') {
    this.data = data;
    this.fileType = fileType;
    this.fileName = fileName;
  }

  public getDownloadURL(): string {
    const blob = this.generateBlobToDownlaod();
    return this.generateDownloadUrl(blob);
  }

  public revokeDownloadURL(url: string): void {
    return URL.revokeObjectURL(url);
  }

  public handleDownloadClick(): void {
    const link = document.createElement('a');
    link.href = this.getDownloadURL();
    link.download = this.fileName;
    link.click();
    this.revokeDownloadURL(link.href);
  }

  private generateBlobToDownlaod(): Blob {
    return new Blob([this.data], { type: this.fileType });
  }

  private generateDownloadUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }
}

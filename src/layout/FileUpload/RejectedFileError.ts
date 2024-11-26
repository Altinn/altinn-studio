import type { FileRejection } from 'react-dropzone';

export class RejectedFileError extends Error {
  public data: {
    rejection: FileRejection;
    maxFileSizeInMB: number;
  };
  constructor(rejection: FileRejection, maxFileSizeInMB: number) {
    super(`File ${rejection.file.name} was rejected`);
    this.data = { rejection, maxFileSizeInMB };
  }
}

export function isRejectedFileError(error: unknown): error is RejectedFileError {
  return error instanceof RejectedFileError;
}

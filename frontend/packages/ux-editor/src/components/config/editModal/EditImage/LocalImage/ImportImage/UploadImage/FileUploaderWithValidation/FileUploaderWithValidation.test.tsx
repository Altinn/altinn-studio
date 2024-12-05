import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import type { FileValidation, FileUploaderWithValidationProps } from './FileUploaderWithValidation';
import { BYTES_IN_A_MEGA_BYTE, FileUploaderWithValidation } from './FileUploaderWithValidation';
import userEvent from '@testing-library/user-event';

// Test data:
const uploaderButtonText = 'Upload file';
const onUploadFile = jest.fn();
const defaultProps: FileUploaderWithValidationProps = {
  onUploadFile,
  uploaderButtonText,
};

describe('FileUploaderWithValidation', () => {
  afterEach(jest.clearAllMocks);

  it('should render only studioButton by default ', () => {
    renderFileUploader({ uploaderButtonText: undefined });
    const uploadButton = screen.getByRole('button', { name: '' });
    expect(uploadButton).toBeInTheDocument();
  });

  it('should render studioButton with buttonText when provided', () => {
    renderFileUploader();
    expect(getUploadButton()).toBeInTheDocument();
  });

  it('should send uploaded file in callback', async () => {
    const user = userEvent.setup();
    const fileNameMock = 'fileNameMock';
    renderFileUploader();
    const file = new File(['test'], fileNameMock, { type: 'image/png' });
    await user.upload(getFileInputElement(), file);
    const formDataMock = new FormData();
    formDataMock.append('file', file);
    expect(onUploadFile).toHaveBeenCalledTimes(1);
    expect(onUploadFile).toHaveBeenCalledWith(formDataMock, fileNameMock);
  });

  it('should render uploadButton as disabled and not trigger callback on upload when disabled prop is set', async () => {
    const user = userEvent.setup();
    renderFileUploader({ disabled: true });
    expect(getUploadButton()).toBeDisabled();

    const file = new File(['test'], 'fileNameMock', { type: 'image/png' });
    await user.upload(getFileInputElement(), file);
    expect(onUploadFile).not.toHaveBeenCalled();
  });

  it('should not do callback if uploaded file does not match provided accept prop', async () => {
    const user = userEvent.setup();
    const accept = '.fileExtension';
    renderFileUploader({ accept });
    const file = new File(['test'], 'fileNameMock.someOtherExtension', { type: 'image/png' });
    await user.upload(getFileInputElement(), file);
    expect(onUploadFile).not.toHaveBeenCalled();
  });

  it('should do callback if uploaded file does match provided accept prop', async () => {
    const user = userEvent.setup();
    const accept = '.fileExtension';
    renderFileUploader({ accept });
    const file = new File(['test'], `fileNameMock${accept}`, { type: 'image/png' });
    await user.upload(getFileInputElement(), file);
    expect(onUploadFile).toHaveBeenCalledTimes(1);
  });

  it('should validate file as valid if customFileNameValidation is not defined', async () => {
    const user = userEvent.setup();
    renderFileUploader();
    const file = new File(['test'], 'fileNameMock', { type: 'image/png' });
    await user.upload(getFileInputElement(), file);
    expect(onUploadFile).toHaveBeenCalledTimes(1);
  });

  it('should call onInvalidFileName and not upload callback when validateFileName returns false', async () => {
    const user = userEvent.setup();
    const onInvalidFileName = jest.fn();
    const customFileValidation: FileValidation = {
      validateFileName: () => false,
      onInvalidFileName,
    };
    renderFileUploader({ customFileValidation });
    const file = new File(['test'], 'fileNameMock', { type: 'image/png' });
    await user.upload(getFileInputElement(), file);
    expect(onUploadFile).not.toHaveBeenCalled();
    expect(onInvalidFileName).toHaveBeenCalledTimes(1);
  });

  it('should not call onInvalidFileName and upload callback when validateFileName returns true', async () => {
    const user = userEvent.setup();
    const onInvalidFileName = jest.fn();
    const customFileValidation: FileValidation = {
      validateFileName: () => true,
      onInvalidFileName,
    };
    renderFileUploader({ customFileValidation });
    const file = new File(['test'], 'fileNameMock', { type: 'image/png' });
    await user.upload(getFileInputElement(), file);
    expect(onUploadFile).toHaveBeenCalledTimes(1);
    expect(onInvalidFileName).not.toHaveBeenCalled();
  });

  it('should call onInvalidFileSize and not upload callback when fileSize is larger than fileSizeLimit', async () => {
    const user = userEvent.setup();
    const onInvalidFileSize = jest.fn();
    const fileSizeLimitMb = 1;
    const customFileValidation: FileValidation = {
      onInvalidFileSize,
      fileSizeLimitMb,
    };
    renderFileUploader({ customFileValidation });
    const file = new File(
      [new Blob([new Uint8Array(fileSizeLimitMb * BYTES_IN_A_MEGA_BYTE + 1)])],
      'fileNameMock',
      { type: 'image/png' },
    );
    await user.upload(getFileInputElement(), file);
    expect(onUploadFile).not.toHaveBeenCalled();
    expect(onInvalidFileSize).toHaveBeenCalledTimes(1);
  });

  it('should not call onInvalidFileSize and upload callback when fileSize is smaller than fileSizeLimit', async () => {
    const user = userEvent.setup();
    const onInvalidFileSize = jest.fn();
    const fileSizeLimitMb = 1;
    const customFileValidation: FileValidation = {
      onInvalidFileSize,
      fileSizeLimitMb,
    };
    renderFileUploader({ customFileValidation });
    const file = new File(
      [new Uint8Array(fileSizeLimitMb * BYTES_IN_A_MEGA_BYTE)],
      'fileNameMock',
      {
        type: 'image/png',
      },
    );
    await user.upload(getFileInputElement(), file);
    expect(onUploadFile).toHaveBeenCalledTimes(1);
    expect(onInvalidFileSize).not.toHaveBeenCalled();
  });

  it('should not call upload callback when no file is uploaded', async () => {
    const user = userEvent.setup();
    renderFileUploader();
    await user.upload(getFileInputElement(), undefined);
    expect(onUploadFile).not.toHaveBeenCalled();
  });
});

function renderFileUploader(props: Partial<FileUploaderWithValidationProps> = {}): RenderResult {
  return render(<FileUploaderWithValidation {...defaultProps} {...props} />);
}

function getFileInputElement(): HTMLInputElement {
  return screen.getByLabelText(uploaderButtonText) as HTMLInputElement;
}

function getUploadButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: uploaderButtonText }) as HTMLButtonElement;
}

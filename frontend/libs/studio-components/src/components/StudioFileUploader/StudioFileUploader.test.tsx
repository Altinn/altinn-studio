import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { BITS_IN_A_MEGA_BYTE, StudioFileUploader } from './StudioFileUploader';
import userEvent from '@testing-library/user-event';

const dataTestId = 'fileInputElement';
const fileInputRef: React.MutableRefObject<HTMLInputElement> = createRef();

describe('StudioFileUploader', () => {
  it('should render only studioButton by default ', () => {
    render(<StudioFileUploader onUploadFile={jest.fn()} />);
    const uploadButton = screen.getByRole('button');

    expect(uploadButton).toBeInTheDocument();
  });

  it('should render studioButton with buttonText when provided', () => {
    const uploaderButtonText = 'Upload file';
    render(<StudioFileUploader onUploadFile={jest.fn()} uploaderButtonText={uploaderButtonText} />);
    const uploadButton = screen.getByRole('button', { name: uploaderButtonText });

    expect(uploadButton).toBeInTheDocument();
  });

  it('should send uploaded file in callback', async () => {
    const user = userEvent.setup();
    const fileNameMock = 'fileNameMock';
    const onUploadFileMock = jest.fn();
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        dataTestId={dataTestId}
        ref={fileInputRef}
      />,
    );
    const fileInput = screen.getByTestId(dataTestId);
    const file = new File(['test'], fileNameMock, { type: 'image/png' });
    await user.upload(fileInput, file);

    const formDataMock = new FormData();
    formDataMock.append('file', file);
    expect(onUploadFileMock).toHaveBeenCalledTimes(1);
    expect(onUploadFileMock).toHaveBeenCalledWith(formDataMock, fileNameMock);
  });

  it('should render uploadButton as disabled and not trigger callback on click when disabled prop is set', async () => {
    const user = userEvent.setup();
    const onUploadFileMock = jest.fn();
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        disabled
        dataTestId={dataTestId}
        ref={fileInputRef}
      />,
    );

    const uploadButton = screen.getByRole('button');
    expect(uploadButton).toBeDisabled();

    const fileInput = screen.getByTestId(dataTestId);
    const file = new File(['test'], 'fileNameMock', { type: 'image/png' });
    await user.upload(fileInput, file);

    expect(onUploadFileMock).not.toHaveBeenCalled();
  });

  it('should not do callback if uploaded file does not match provided accept prop', async () => {
    const user = userEvent.setup();
    const accept = '.fileExtension';
    const onUploadFileMock = jest.fn();
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        accept={accept}
        dataTestId={dataTestId}
        ref={fileInputRef}
      />,
    );
    const fileInput = screen.getByTestId(dataTestId);
    const file = new File(['test'], 'fileNameMock.someOtherExtension', { type: 'image/png' });
    await user.upload(fileInput, file);

    expect(onUploadFileMock).not.toHaveBeenCalled();
  });

  it('should do callback if uploaded file does match provided accept prop', async () => {
    const user = userEvent.setup();
    const accept = '.fileExtension';
    const onUploadFileMock = jest.fn();
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        accept={accept}
        dataTestId={dataTestId}
        ref={fileInputRef}
      />,
    );
    const fileInput = screen.getByTestId(dataTestId);
    const file = new File(['test'], `fileNameMock${accept}`, { type: 'image/png' });
    await user.upload(fileInput, file);

    expect(onUploadFileMock).toHaveBeenCalledTimes(1);
  });

  it('should validate file as valid if customFileNameValidation is not defined', async () => {
    const user = userEvent.setup();
    const onUploadFileMock = jest.fn();
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        dataTestId={dataTestId}
        ref={fileInputRef}
      />,
    );
    const fileInput = screen.getByTestId(dataTestId);
    const file = new File(['test'], 'fileNameMock', { type: 'image/png' });
    await user.upload(fileInput, file);

    expect(onUploadFileMock).toHaveBeenCalledTimes(1);
  });

  it('should call onInvalidFileName and not upload callback when validateFileName returns false', async () => {
    const user = userEvent.setup();
    const onUploadFileMock = jest.fn();
    const onInvalidFileNameMock = jest.fn();
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        customFileValidation={{
          validateFileName: jest.fn().mockReturnValue(false),
          onInvalidFileName: onInvalidFileNameMock,
        }}
        dataTestId={dataTestId}
        ref={fileInputRef}
      />,
    );
    const fileInput = screen.getByTestId(dataTestId);
    const file = new File(['test'], 'fileNameMock', { type: 'image/png' });
    await user.upload(fileInput, file);

    expect(onUploadFileMock).not.toHaveBeenCalled();
    expect(onInvalidFileNameMock).toHaveBeenCalledTimes(1);
  });

  it('should not call onInvalidFileName and upload callback when validateFileName returns true', async () => {
    const user = userEvent.setup();
    const onUploadFileMock = jest.fn();
    const onInvalidFileNameMock = jest.fn();
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        customFileValidation={{
          validateFileName: jest.fn().mockReturnValue(true),
          onInvalidFileName: onInvalidFileNameMock,
        }}
        dataTestId={dataTestId}
        ref={fileInputRef}
      />,
    );
    const fileInput = screen.getByTestId(dataTestId);
    const file = new File(['test'], 'fileNameMock', { type: 'image/png' });
    await user.upload(fileInput, file);

    expect(onUploadFileMock).toHaveBeenCalledTimes(1);
    expect(onInvalidFileNameMock).not.toHaveBeenCalled();
  });

  it('should call onInvalidFileSize and not upload callback when fileSize is larger than fileSizeLimit', async () => {
    const user = userEvent.setup();
    const onUploadFileMock = jest.fn();
    const onInvalidFileSizeMock = jest.fn();
    const fileSizeLimitMb = 1;
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        customFileValidation={{
          onInvalidFileSize: onInvalidFileSizeMock,
          fileSizeLimitMb,
        }}
        dataTestId={dataTestId}
        ref={fileInputRef}
      />,
    );
    const fileInput = screen.getByTestId(dataTestId);
    const file = new File(
      [new Blob([new Uint8Array(fileSizeLimitMb * BITS_IN_A_MEGA_BYTE + 1)])],
      'fileNameMock',
      { type: 'image/png' },
    );
    await user.upload(fileInput, file);

    expect(onUploadFileMock).not.toHaveBeenCalled();
    expect(onInvalidFileSizeMock).toHaveBeenCalledTimes(1);
  });

  it('should not call onInvalidFileSize and upload callback when fileSize is smaller than fileSizeLimit', async () => {
    const user = userEvent.setup();
    const onUploadFileMock = jest.fn();
    const onInvalidFileSizeMock = jest.fn();
    const fileSizeLimitMb = 1;
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        customFileValidation={{
          onInvalidFileSize: onInvalidFileSizeMock,
          fileSizeLimitMb,
        }}
        dataTestId={dataTestId}
        ref={fileInputRef}
      />,
    );
    const fileInput = screen.getByTestId(dataTestId);
    const file = new File([new Uint8Array(fileSizeLimitMb * BITS_IN_A_MEGA_BYTE)], 'fileNameMock', {
      type: 'image/png',
    });
    await user.upload(fileInput, file);

    expect(onUploadFileMock).toHaveBeenCalledTimes(1);
    expect(onInvalidFileSizeMock).not.toHaveBeenCalled();
  });
});

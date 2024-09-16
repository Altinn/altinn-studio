import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { StudioFileUploader } from './StudioFileUploader';
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

  it('should validate file as valid if fileRegEx is not provided, but onInvalidFileName is', async () => {
    const user = userEvent.setup();
    const onUploadFileMock = jest.fn();
    const onInvalidFileNameMock = jest.fn();
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        onInvalidFileName={onInvalidFileNameMock}
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

  it('should validate file as valid if onInvalidFileName is not provided, but fileRegEx is', async () => {
    const user = userEvent.setup();
    const onUploadFileMock = jest.fn();
    const fileNameRegEx: RegExp = /^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/;
    const fileNameNotMatchingRegEx = 'æøå';
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        fileNameRegEx={fileNameRegEx}
        dataTestId={dataTestId}
        ref={fileInputRef}
      />,
    );
    const fileInput = screen.getByTestId(dataTestId);
    const file = new File(['test'], fileNameNotMatchingRegEx, { type: 'image/png' });
    await user.upload(fileInput, file);

    expect(onUploadFileMock).toHaveBeenCalledTimes(1);
  });

  it('should call onInvalidFileName and not upload callback when uploaded file name does not match regEx', async () => {
    const user = userEvent.setup();
    const onUploadFileMock = jest.fn();
    const onInvalidFileNameMock = jest.fn();
    const fileNameRegEx: RegExp = /^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/;
    const fileNameNotMatchingRegEx = 'æøå';
    render(
      <StudioFileUploader
        onUploadFile={onUploadFileMock}
        fileNameRegEx={fileNameRegEx}
        onInvalidFileName={onInvalidFileNameMock}
        dataTestId={dataTestId}
        ref={fileInputRef}
      />,
    );
    const fileInput = screen.getByTestId(dataTestId);
    const file = new File(['test'], fileNameNotMatchingRegEx, { type: 'image/png' });
    await user.upload(fileInput, file);

    expect(onUploadFileMock).not.toHaveBeenCalled();
    expect(onInvalidFileNameMock).toHaveBeenCalledTimes(1);
  });
});

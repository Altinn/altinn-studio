import React from 'react';
import type { Ref } from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StudioFileUploaderProps } from './';
import { StudioFileUploader } from './';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

// Test data:
const uploaderButtonText = 'Upload file';
const onSubmit = jest.fn();
const defaultProps: StudioFileUploaderProps = {
  onSubmit,
  uploaderButtonText,
};

describe('StudioFileUploader', () => {
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
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(file);
  });

  it('should render uploadButton as disabled and not trigger callback on upload when disabled prop is set', async () => {
    const user = userEvent.setup();
    renderFileUploader({ disabled: true });
    expect(getUploadButton()).toBeDisabled();

    const file = new File(['test'], 'fileNameMock', { type: 'image/png' });
    await user.upload(getFileInputElement(), file);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should not do callback if uploaded file does not match provided accept prop', async () => {
    const user = userEvent.setup();
    const accept = '.fileExtension';
    renderFileUploader({ accept });
    const file = new File(['test'], 'fileNameMock.someOtherExtension', { type: 'image/png' });
    await user.upload(getFileInputElement(), file);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should do callback if uploaded file does match provided accept prop', async () => {
    const user = userEvent.setup();
    const accept = '.fileExtension';
    renderFileUploader({ accept });
    const file = new File(['test'], `fileNameMock${accept}`, { type: 'image/png' });
    await user.upload(getFileInputElement(), file);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('should not call submit callback when no file is uploaded', async () => {
    const user = userEvent.setup();
    renderFileUploader();
    await user.upload(getFileInputElement(), undefined);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should call submit callback twice when uploading the same file consecutively', async () => {
    const user = userEvent.setup();
    renderFileUploader();
    const file = new File(['test'], 'fileNameMock.json', { type: 'image/png' });
    await user.upload(getFileInputElement(), file);
    await user.upload(getFileInputElement(), file);
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('Applies given class name to the root element', () => {
    testRootClassNameAppending((className: string) => renderFileUploader({ className }));
  });

  it('Appends custom attributes to the file input element', () => {
    testCustomAttributes<HTMLInputElement, StudioFileUploaderProps>(
      renderFileUploader,
      getFileInputElement,
    );
  });

  it('Forwards the ref to the file input element if given', () => {
    testRefForwarding<HTMLInputElement>((ref) => renderFileUploader({}, ref), getFileInputElement);
  });
});

function renderFileUploader(
  props: Partial<StudioFileUploaderProps> = {},
  ref?: Ref<HTMLInputElement>,
): RenderResult {
  return render(<StudioFileUploader {...defaultProps} {...props} ref={ref} />);
}

function getFileInputElement(): HTMLInputElement {
  return screen.getByLabelText(uploaderButtonText) as HTMLInputElement;
}

function getUploadButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: uploaderButtonText }) as HTMLButtonElement;
}

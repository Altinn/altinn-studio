import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { ImportImage } from '@altinn/ux-editor/components/config/editModal/EditImage/LocalImage/ImportImage/ImportImage';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import type { UploadImageProps } from './UploadImage/UploadImage';

jest.mock('./UploadImage/UploadImage', () => ({
  UploadImage: ({ onHandleSubmit, onHandleInputChange, imageRef }: UploadImageProps) => (
    <div>
      <input type='file' ref={imageRef} onChange={onHandleInputChange} data-testid='upload-input' />
      <button onClick={onHandleSubmit} data-testid='submit-button'>
        Upload
      </button>
    </div>
  ),
}));
const onImageChangeMock = jest.fn();

describe('ImportImage', () => {
  it('should handle successful image upload', async () => {
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    renderImportImage();
    const fileInput = screen.getByTestId('upload-input');
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(fileInput, file);
    expect(onImageChangeMock).toHaveBeenCalledWith(`wwwroot/${imageFileName}`);
  });
  it('should show overrideExistingImageModal if trying to upload an image that exists', async () => {
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    const addImageMock = jest
      .fn()
      .mockImplementation(() => Promise.reject(createApiErrorMock(400, 'AD_04')));
    renderImportImage({ addImage: addImageMock });
    const fileInput = screen.getByTestId('upload-input');
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(fileInput, file);
    const overrideExistingImageModalHeading = screen.getByRole('heading', {
      name: textMock('ux_editor.properties_panel.images.override_existing_image_modal_title'),
    });
    expect(overrideExistingImageModalHeading).toBeInTheDocument();
  });
  it('should call addImage twice when uploading an existing image and clicking override button in modal', async () => {
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    const addImageMock = jest
      .fn()
      .mockImplementation(() => Promise.reject(createApiErrorMock(400, 'AD_04')));
    renderImportImage({ addImage: addImageMock });
    const fileInput = screen.getByTestId('upload-input');
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(fileInput, file);
    const overrideExistingImageButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.override_existing_image_button'),
    });
    await user.click(overrideExistingImageButton);
    const formDataMock = new FormData();
    formDataMock.append('image', file);
    const formDataOverrideExistingMock = new FormData();
    formDataOverrideExistingMock.append('image', file);
    formDataOverrideExistingMock.append('overrideExisting', 'true');
    expect(addImageMock).toHaveBeenCalledTimes(2);
    expect(addImageMock).toHaveBeenNthCalledWith(1, org, app, formDataMock);
    expect(addImageMock).toHaveBeenNthCalledWith(2, org, app, formDataOverrideExistingMock);
  });
});

const renderImportImage = (queries: Partial<ServicesContextProps> = queriesMock) => {
  renderWithProviders(<ImportImage onImageChange={onImageChangeMock} />, { queries });
};

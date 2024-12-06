import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { ImportImage } from './ImportImage';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { MAX_FILE_SIZE_MB } from '@altinn/ux-editor/components/config/editModal/EditImage/constants';
import { textMock } from '@studio/testing/mocks/i18nMock';

const onImageChangeMock = jest.fn();

describe('ImportImage', () => {
  afterEach(jest.clearAllMocks);

  it('should handle successful image upload', async () => {
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    renderImportImage();
    const fileInput = getFileInputElement();
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(fileInput, file);
    expect(onImageChangeMock).toHaveBeenCalledWith(`wwwroot/${imageFileName}`);
  });

  it('should show spinner when image is being uploaded', async () => {
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    const addImageMock = jest
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));
    renderImportImage({ addImage: addImageMock });
    const fileInput = getFileInputElement();
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(fileInput, file);
    const spinnerText = screen.getByText(textMock('general.loading'));
    expect(spinnerText).toBeInTheDocument();
  });

  it('should show toast error if uploading an image that is larger than MAX_FILE_SIZE_MB', async () => {
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    renderImportImage();
    const fileInput = getFileInputElement();
    const file = new File(
      [new Blob([new Uint8Array(MAX_FILE_SIZE_MB * 1024 * 1024 + 1)])],
      imageFileName,
      { type: 'image/png' },
    );
    await user.upload(fileInput, file);
    const toastError = screen.getByText(
      textMock('ux_editor.properties_panel.images.file_size_exceeds_limit', {
        maxSize: MAX_FILE_SIZE_MB,
      }),
    );
    expect(toastError).toBeInTheDocument();
  });

  it('should show confirm dialog if trying to upload an image that exists', async () => {
    window.confirm = jest.fn();
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.ImageFileNames, org, app], [imageFileName]);
    renderImportImage({}, queryClientMock);
    const fileInput = getFileInputElement();
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(fileInput, file);
    expect(window.confirm).toHaveBeenCalled();
  });

  it('should call addImage with overrideExisting when uploading an existing image and clicking override button in modal', async () => {
    window.confirm = jest.fn(() => true);
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.ImageFileNames, org, app], [imageFileName]);
    const addImageMock = jest.fn();
    renderImportImage({ addImage: addImageMock }, queryClientMock);
    const fileInput = getFileInputElement();
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(fileInput, file);

    const formDataOverrideExistingMock = new FormData();
    formDataOverrideExistingMock.append('image', file);
    formDataOverrideExistingMock.append('overrideExisting', 'true');

    expect(addImageMock).toHaveBeenCalledTimes(1);
    const formDataCalls = addImageMock.mock.calls;
    expect(formDataCalls[0][2].get('file')).toEqual(formDataOverrideExistingMock.get('image'));
    expect(formDataCalls[0][2].get('overrideExisting')).toEqual(
      formDataOverrideExistingMock.get('overrideExisting'),
    );
  });
});

const renderImportImage = (
  queries: Partial<ServicesContextProps> = queriesMock,
  queryClient: QueryClient = createQueryClientMock(),
) => {
  renderWithProviders(<ImportImage onImageChange={onImageChangeMock} />, { queries, queryClient });
};

const getFileInputElement = (): HTMLInputElement =>
  screen.getByLabelText(textMock('ux_editor.properties_panel.images.upload_image'));

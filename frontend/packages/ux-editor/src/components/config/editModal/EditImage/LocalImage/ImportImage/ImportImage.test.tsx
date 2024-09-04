import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { ImportImage } from './ImportImage';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { fileSelectorInputId } from '@studio/testing/testids';

const onImageChangeMock = jest.fn();

describe('ImportImage', () => {
  it('should handle successful image upload', async () => {
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    renderImportImage();
    const fileInput = screen.getByTestId(fileSelectorInputId);
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(fileInput, file);
    expect(onImageChangeMock).toHaveBeenCalledWith(`wwwroot/${imageFileName}`);
  });

  it('should show overrideExistingConfirmDialogue if trying to upload an image that exists', async () => {
    window.confirm = jest.fn();
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    const addImageMock = jest
      .fn()
      .mockImplementation(() => Promise.reject(createApiErrorMock(400, 'AD_04')));
    renderImportImage({ addImage: addImageMock });
    const fileInput = screen.getByTestId(fileSelectorInputId);
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(fileInput, file);
    expect(window.confirm).toHaveBeenCalled();
  });

  it('should call addImage twice when uploading an existing image and clicking override button in modal', async () => {
    window.confirm = jest.fn(() => true);
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    const addImageMock = jest
      .fn()
      .mockImplementation(() => Promise.reject(createApiErrorMock(400, 'AD_04')));
    renderImportImage({ addImage: addImageMock });
    const fileInput = screen.getByTestId(fileSelectorInputId);
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(fileInput, file);

    const formDataMock = new FormData();
    formDataMock.append('image', file);
    const formDataOverrideExistingMock = new FormData();
    formDataOverrideExistingMock.append('image', file);
    formDataOverrideExistingMock.append('overrideExisting', 'true');

    expect(addImageMock).toHaveBeenCalledTimes(2);
    const formDataCalls = addImageMock.mock.calls;
    expect(formDataCalls[0][2].get('image')).toEqual(formDataMock.get('image'));
    expect(formDataCalls[1][2].get('image')).toEqual(formDataOverrideExistingMock.get('image'));
    expect(formDataCalls[1][2].get('overrideExisting')).toEqual(
      formDataOverrideExistingMock.get('overrideExisting'),
    );
  });
});

const renderImportImage = (queries: Partial<ServicesContextProps> = queriesMock) => {
  renderWithProviders(<ImportImage onImageChange={onImageChangeMock} />, { queries });
};

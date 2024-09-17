import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { ImportImage } from './ImportImage';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { app, fileSelectorInputId, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

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
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.ImageFileNames, org, app], [imageFileName]);
    renderImportImage({}, queryClientMock);
    const fileInput = screen.getByTestId(fileSelectorInputId);
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
    const fileInput = screen.getByTestId(fileSelectorInputId);
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(fileInput, file);

    const formDataOverrideExistingMock = new FormData();
    formDataOverrideExistingMock.append('image', file);
    formDataOverrideExistingMock.append('overrideExisting', 'true');

    expect(addImageMock).toHaveBeenCalledTimes(1);
    const formDataCalls = addImageMock.mock.calls;
    console.log('formDataCalls: ', formDataCalls);
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

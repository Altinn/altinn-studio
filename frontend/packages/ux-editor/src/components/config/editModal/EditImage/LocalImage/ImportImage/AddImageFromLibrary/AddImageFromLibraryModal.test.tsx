import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { AddImageFromLibraryModal } from '@altinn/ux-editor/components/config/editModal/EditImage/LocalImage/ImportImage/AddImageFromLibrary/AddImageFromLibraryModal';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { imagePath } from 'app-shared/api/paths';
import userEvent from '@testing-library/user-event';
import { WWWROOT_FILE_PATH } from '../../../constants';

const onCloseMock = jest.fn();
const onAddImageReferenceMock = jest.fn();

jest.mock('app-shared/api/paths');

describe('AddImageFromLibraryModal', () => {
  it('renders modal', () => {
    renderAddImageFromLibraryModal();
    const modalHeading = screen.getByRole('heading', {
      name: textMock('ux_editor.properties_panel.images.choose_from_library_modal_title'),
    });
    expect(modalHeading).toBeInTheDocument();
  });

  it('renders modal with "no images in library" message when library is empty', () => {
    renderAddImageFromLibraryModal();
    const noImagesInLibraryMessage = screen.getByText(
      textMock('ux_editor.properties_panel.images.no_images_in_library'),
    );
    expect(noImagesInLibraryMessage).toBeInTheDocument();
  });

  it('renders modal with image, fileName and missing description', () => {
    (imagePath as jest.Mock).mockImplementation(
      (mockOrg, mockApp, imageFileName) => `/images/${mockOrg}/${mockApp}/${imageFileName}`,
    );
    const existingImageFileName = 'image.png';
    renderAddImageFromLibraryModal([existingImageFileName]);
    const image = screen.getByRole('img', { name: existingImageFileName });
    const imageAltText = screen.getByAltText(existingImageFileName); // TODO: Change this to description
    const fileName = screen.getByRole('heading', { name: existingImageFileName });
    const missingFileDescription = screen.getByText(
      textMock('ux_editor.properties_panel.images.description_missing'),
    );
    expect(image).toBeInTheDocument();
    expect(imageAltText).toBeInTheDocument();
    expect(fileName).toBeInTheDocument();
    expect(missingFileDescription).toBeInTheDocument();
    expect(imagePath).toHaveBeenCalledWith(org, app, existingImageFileName);
  });

  it('should call onClose when clicking on close modal button', async () => {
    const user = userEvent.setup();
    renderAddImageFromLibraryModal();
    const closeModalButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeModalButton);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should call onAddImageReference when clicking on an image', async () => {
    const user = userEvent.setup();
    const existingImageFileName = 'image.png';
    renderAddImageFromLibraryModal([existingImageFileName]);
    const fileName = screen.getByRole('heading', { name: existingImageFileName });
    await user.click(fileName);
    expect(onAddImageReferenceMock).toHaveBeenCalledTimes(1);
    expect(onAddImageReferenceMock).toHaveBeenCalledWith(WWWROOT_FILE_PATH + existingImageFileName);
  });
});

const renderAddImageFromLibraryModal = (imageFileNames: string[] = []) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.ImageFileNames, org, app], imageFileNames);
  renderWithProviders(
    <AddImageFromLibraryModal
      isOpen={true}
      onClose={onCloseMock}
      onAddImageReference={onAddImageReferenceMock}
    />,
    { queryClient },
  );
};

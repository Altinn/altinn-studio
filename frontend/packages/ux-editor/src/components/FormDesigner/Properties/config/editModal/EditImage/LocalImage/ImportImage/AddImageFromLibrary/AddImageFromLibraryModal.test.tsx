import React, { createRef } from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { AddImageFromLibraryModal } from './AddImageFromLibraryModal';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { imagePath } from 'app-shared/api/paths';
import userEvent from '@testing-library/user-event';
import { WWWROOT_FILE_PATH } from '../../../constants';

const onAddImageReferenceMock = jest.fn();

jest.mock('app-shared/api/paths');

describe('AddImageFromLibraryModal', () => {
  it('renders modal', async () => {
    await renderAddImageFromLibraryModal();
    const modalHeading = screen.getByRole('heading', {
      name: textMock('ux_editor.properties_panel.images.choose_from_library_modal_title'),
    });
    expect(modalHeading).toBeInTheDocument();
  });

  it('renders modal with "no images in library" message when library is empty', async () => {
    await renderAddImageFromLibraryModal();
    const noImagesInLibraryMessage = screen.getByText(
      textMock('ux_editor.properties_panel.images.no_images_in_library'),
    );
    expect(noImagesInLibraryMessage).toBeInTheDocument();
  });

  it('renders modal with image and fileName', async () => {
    const existingImageFileName = 'image.png';
    await renderAddImageFromLibraryModal([existingImageFileName]);
    const image = screen.getByRole('img', { name: existingImageFileName });
    const imageAltText = screen.getByAltText(existingImageFileName);
    const fileName = screen.getByRole('heading', { name: existingImageFileName });
    expect(image).toBeInTheDocument();
    expect(imageAltText).toBeInTheDocument();
    expect(fileName).toBeInTheDocument();
    expect(imagePath).toHaveBeenCalledWith(org, app, existingImageFileName);
  });

  it('should call onAddImageReference when clicking on an image', async () => {
    const user = userEvent.setup();
    const existingImageFileName = 'image.png';
    await renderAddImageFromLibraryModal([existingImageFileName]);
    const fileName = screen.getByRole('heading', { name: existingImageFileName });
    await user.click(fileName);
    expect(onAddImageReferenceMock).toHaveBeenCalledTimes(1);
    expect(onAddImageReferenceMock).toHaveBeenCalledWith(WWWROOT_FILE_PATH + existingImageFileName);
  });
});

const renderAddImageFromLibraryModal = async (imageFileNames: string[] = []) => {
  const queryClient = createQueryClientMock();
  const ref = createRef<HTMLDialogElement>();
  queryClient.setQueryData([QueryKey.ImageFileNames, org, app], imageFileNames);
  renderWithProviders(
    <AddImageFromLibraryModal onAddImageReference={onAddImageReferenceMock} ref={ref} />,
    { queryClient },
  );
  ref.current?.showModal();
  await screen.findByRole('dialog');
};

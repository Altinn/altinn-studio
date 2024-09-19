import React from 'react';
import { screen } from '@testing-library/react';
import type { LocalImageProps } from './LocalImage';
import { LocalImage } from './LocalImage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../../testing/mocks';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

describe('LocalImage', () => {
  it('renders buttons for adding from library and uploading by default', () => {
    renderLocalImage();
    const addImageButton = getAddImageButton();
    const uploadImageButton = getUploadImageButton();
    expect(addImageButton).toBeInTheDocument();
    expect(uploadImageButton).toBeInTheDocument();
  });

  it('renders alert that external image reference exists when componentHasExternalImageReference is true', () => {
    renderLocalImage({ componentHasExternalImageReference: true });
    const externalImageRefExistsAlert = getExternalImageRefExistsAlert();
    expect(externalImageRefExistsAlert).toBeInTheDocument();
  });

  it('renders library modal when clicking on "add from library" button', async () => {
    const user = userEvent.setup();
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.ImageFileNames, org, app], []);
    renderLocalImage({}, queryClientMock);
    const addImageButton = getAddImageButton();
    await user.click(addImageButton);
    const libraryModalHeading = getLibraryModalHeading();
    expect(libraryModalHeading).toBeInTheDocument();
  });
});

const getAddImageButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.properties_panel.images.choose_from_library'),
  });

const getUploadImageButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.properties_panel.images.upload_image'),
  });

const getExternalImageRefExistsAlert = () =>
  screen.getByText(
    textMock('ux_editor.properties_panel.images.conflicting_image_source_when_uploading_image'),
  );

const getLibraryModalHeading = () =>
  screen.getByRole('heading', {
    name: textMock('ux_editor.properties_panel.images.choose_from_library_modal_title'),
  });

const onDeleteImageMock = jest.fn();
const onDeleteImageReferenceOnlyMock = jest.fn();
const onImageChangeMock = jest.fn();
const defaultProps: LocalImageProps = {
  componentHasExternalImageReference: false,
  fileName: undefined,
  onDeleteImage: onDeleteImageMock,
  onDeleteImageReferenceOnly: onDeleteImageReferenceOnlyMock,
  onImageChange: onImageChangeMock,
};
const renderLocalImage = (
  props: Partial<LocalImageProps> = {},
  queryClient = createQueryClientMock(),
) => {
  renderWithProviders(<LocalImage {...defaultProps} {...props} />, { queryClient });
};

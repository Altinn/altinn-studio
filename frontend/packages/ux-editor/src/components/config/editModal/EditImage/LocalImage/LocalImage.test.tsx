import React from 'react';
import { screen } from '@testing-library/react';
import type { LocalImageProps } from './LocalImage';
import { LocalImage } from './LocalImage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

describe('LocalImage', () => {
  it('renders buttons for adding from library and uploading by default', () => {
    renderLocalImage();
    const addImageButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.choose_from_library'),
    });
    const uploadImageButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.upload_image'),
    });
    expect(addImageButton).toBeInTheDocument();
    expect(uploadImageButton).toBeInTheDocument();
  });
  it('renders alert that external image reference exists when componentHasExternalImageReference is true', () => {
    renderLocalImage({ componentHasExternalImageReference: true });
    const externalImageRefExistsAlert = screen.getByText(
      textMock('ux_editor.properties_panel.images.conflicting_image_source_when_uploading_image'),
    );
    expect(externalImageRefExistsAlert).toBeInTheDocument();
  });
  it('renders library modal when clicking on "add from library" button', async () => {
    const user = userEvent.setup();
    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.ImageFileNames, org, app], []);
    renderLocalImage({}, queryClientMock);
    const addImageButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.choose_from_library'),
    });
    await user.click(addImageButton);
    const libraryModal = screen.getByRole('heading', {
      name: textMock('ux_editor.properties_panel.images.choose_from_library_modal_title'),
    });
    expect(libraryModal).toBeInTheDocument();
  });
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

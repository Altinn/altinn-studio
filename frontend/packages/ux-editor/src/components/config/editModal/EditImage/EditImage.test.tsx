import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { EditImage } from './EditImage';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { QueryClient } from '@tanstack/react-query';

const handleComponentChangeMock = jest.fn();
const imageComponentMock = componentMocks[ComponentType.Image];

describe('EditImage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('renders tabs for adding image and for pasting url', () => {
    renderEditImage();
    const addImageTab = screen.getByRole('tab', {
      name: textMock('ux_editor.properties_panel.images.add_image_tab_title'),
    });
    const pasteUrlTab = screen.getByRole('tab', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url_tab_title'),
    });
    expect(addImageTab).toBeInTheDocument();
    expect(pasteUrlTab).toBeInTheDocument();
  });

  it('renders tab for adding image as selected by default', () => {
    renderEditImage();
    const addImageTab = screen.getByRole('tab', {
      name: textMock('ux_editor.properties_panel.images.add_image_tab_title'),
    });
    const pasteUrlTab = screen.getByRole('tab', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url_tab_title'),
    });
    expect(addImageTab).toHaveAttribute('aria-selected', 'true');
    expect(pasteUrlTab).toHaveAttribute('aria-selected', 'false');
  });

  it('toggles to paste url tab when clicking', async () => {
    const user = userEvent.setup();
    renderEditImage();
    const addImageTab = screen.getByRole('tab', {
      name: textMock('ux_editor.properties_panel.images.add_image_tab_title'),
    });
    const pasteUrlTab = screen.getByRole('tab', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url_tab_title'),
    });
    await user.click(pasteUrlTab);
    expect(addImageTab).toHaveAttribute('aria-selected', 'false');
    expect(pasteUrlTab).toHaveAttribute('aria-selected', 'true');
  });

  it('calls handleComponentChange when image is added', async () => {
    const user = userEvent.setup();
    renderEditImage();
    const uploadImageButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.upload_image'),
    });
    await user.click(uploadImageButton);
    // How to mock the file upload?
    //expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
  });

  it('calls handleComponentChange when image url is pasted', async () => {
    const user = userEvent.setup();
    const externalUrl = 'http://external.url';
    renderEditImage();
    await user.click(
      screen.getByRole('tab', {
        name: textMock('ux_editor.properties_panel.images.enter_external_url_tab_title'),
      }),
    );
    const enterUrlField = screen.getByRole('textbox', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url'),
    });
    await user.type(enterUrlField, externalUrl);
    await waitFor(() => enterUrlField.blur());
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    expect(handleComponentChangeMock).toHaveBeenCalledWith({
      ...componentMocks[ComponentType.Image],
      image: {
        src: {
          nb: externalUrl,
        },
        width: '100%',
        align: 'center',
      },
    });
  });

  it('calls handleComponentChange when image url is deleted', async () => {
    const user = userEvent.setup();
    const existingExternalUrl = 'http://external.url';
    renderEditImage({
      ...imageComponentMock,
      image: {
        ...imageComponentMock.image,
        src: {
          nb: existingExternalUrl,
        },
      },
    });
    await user.click(
      screen.getByRole('tab', {
        name: textMock('ux_editor.properties_panel.images.enter_external_url_tab_title'),
      }),
    );
    const existingUrlButton = screen.getByRole('button', {
      name:
        textMock('ux_editor.properties_panel.images.enter_external_url') +
        ' ' +
        existingExternalUrl,
    });
    await user.click(existingUrlButton);
    const enterUrlField = screen.getByRole('textbox', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url'),
    });
    await user.clear(enterUrlField);
    await waitFor(() => enterUrlField.blur());
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    expect(handleComponentChangeMock).toHaveBeenCalledWith({
      ...componentMocks[ComponentType.Image],
      image: {
        ...imageComponentMock.image,
        src: {},
      },
    });
  });

  it('calls handleComponentChange when added image reference is deleted', async () => {
    const user = userEvent.setup();
    const existingFileFromLibrary = 'existingImageFromLibrary.png';
    const existingImageFromLibrary = `wwwroot/${existingFileFromLibrary}`;
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.ImageFileNames, org, app], [existingFileFromLibrary]);
    renderEditImage(
      {
        ...imageComponentMock,
        image: {
          ...imageComponentMock.image,
          src: {
            nb: existingImageFromLibrary,
          },
        },
      },
      {},
      queryClient,
    );
    const deleteImageButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.delete_image_reference_title'),
    });
    await user.click(deleteImageButton);
    const deleteOnlyReferenceButton = screen.getByRole('button', {
      name: textMock(
        'ux_editor.properties_panel.images.delete_image_options_modal_button_only_ref',
      ),
    });
    await user.click(deleteOnlyReferenceButton);
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    expect(handleComponentChangeMock).toHaveBeenCalledWith({
      ...componentMocks[ComponentType.Image],
      image: {
        ...imageComponentMock.image,
        src: {},
      },
    });
  });

  it('calls handleComponentChange and deleteImageMutation when added image is deleted from component and from library', async () => {
    const user = userEvent.setup();
    const existingFileFromLibrary = 'existingImageFromLibrary.png';
    const existingImageFromLibrary = `wwwroot/${existingFileFromLibrary}`;
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.ImageFileNames, org, app], [existingFileFromLibrary]);
    renderEditImage(
      {
        ...imageComponentMock,
        image: {
          ...imageComponentMock.image,
          src: {
            nb: existingImageFromLibrary,
          },
        },
      },
      {},
      queryClient,
    );
    const deleteImageButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.delete_image_reference_title'),
    });
    await user.click(deleteImageButton);
    const deleteImageAndReferenceButton = screen.getByRole('button', {
      name: textMock(
        'ux_editor.properties_panel.images.delete_image_options_modal_button_ref_and_from_library',
      ),
    });
    await user.click(deleteImageAndReferenceButton);
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    expect(handleComponentChangeMock).toHaveBeenCalledWith({
      ...componentMocks[ComponentType.Image],
      image: {
        ...imageComponentMock.image,
        src: {},
      },
    });
    expect(queriesMock.deleteImage).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteImage).toHaveBeenCalledWith(org, app, existingFileFromLibrary);
  });
});

const renderEditImage = (
  imageComponent: FormItem<ComponentType.Image> = imageComponentMock,
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  renderWithProviders(
    <EditImage component={imageComponent} handleComponentChange={handleComponentChangeMock} />,
    { ...queriesMock, ...queries, queryClient },
  );
};

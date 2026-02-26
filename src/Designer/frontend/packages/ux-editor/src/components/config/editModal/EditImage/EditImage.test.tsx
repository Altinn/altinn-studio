import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { EditImage } from './EditImage';
import type { FormItem } from '../../../../types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '../../../../testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../testing/mocks';
import type { UserEvent } from '@testing-library/user-event';
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
    const { addImageTab, pasteUrlTab } = getTabs();
    expect(addImageTab).toBeInTheDocument();
    expect(pasteUrlTab).toBeInTheDocument();
  });

  it('renders tab for adding image as selected by default', () => {
    renderEditImage();
    const { addImageTab, pasteUrlTab } = getTabs();
    expect(addImageTab).toHaveAttribute('aria-selected', 'true');
    expect(pasteUrlTab).toHaveAttribute('aria-selected', 'false');
  });

  it('toggles to paste url tab when clicking', async () => {
    const user = userEvent.setup();
    renderEditImage();
    const { addImageTab, pasteUrlTab } = getTabs();
    await user.click(pasteUrlTab);
    expect(addImageTab).toHaveAttribute('aria-selected', 'false');
    expect(pasteUrlTab).toHaveAttribute('aria-selected', 'true');
  });

  it('calls handleComponentChange when image is added', async () => {
    const user = userEvent.setup();
    const imageFileName = 'image.png';
    renderEditImage();
    const uploadImageLabel = textMock('ux_editor.properties_panel.images.upload_image');
    const uploadImageButton = screen.getByLabelText(uploadImageLabel);
    const file = new File(['test'], imageFileName, { type: 'image/png' });
    await user.upload(uploadImageButton, file);
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
  });

  it('calls handleComponentChange when image url is typed', async () => {
    const user = userEvent.setup();
    const externalUrl = 'http://external.url';
    renderEditImage();
    await goToExternalUrlTab(user);
    await enterUrlInField(user, externalUrl);
    await waitForUrlToBeValidated();
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
    await goToExternalUrlTab(user);
    await enterUrlInField(user, undefined);
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
    await clickDeleteImageButton(user);
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
    await clickDeleteImageButton(user);
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

const getTabs = (): { addImageTab: HTMLElement; pasteUrlTab: HTMLElement } => {
  return {
    addImageTab: screen.getByRole('tab', {
      name: textMock('ux_editor.properties_panel.images.add_image_tab_title'),
    }),
    pasteUrlTab: screen.getByRole('tab', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url_tab_title'),
    }),
  };
};

const goToExternalUrlTab = async (user: UserEvent) => {
  await user.click(
    screen.getByRole('tab', {
      name: textMock('ux_editor.properties_panel.images.enter_external_url_tab_title'),
    }),
  );
};

const clickExistingUrlButton = async (user: UserEvent) => {
  const existingUrlButton = screen.getByRole('button', {
    name: textMock('ux_editor.properties_panel.images.enter_external_url'),
  });
  await user.click(existingUrlButton);
};

const enterUrlInField = async (user: UserEvent, url: string | undefined) => {
  await clickExistingUrlButton(user);
  const enterUrlField = screen.getByRole('textbox', {
    name: textMock('ux_editor.properties_panel.images.enter_external_url'),
  });
  if (url) await user.type(enterUrlField, url);
  else await user.clear(enterUrlField);
  await waitFor(() => enterUrlField.blur());
};

const waitForUrlToBeValidated = async () => {
  await waitForElementToBeRemoved(() =>
    screen.queryByText(textMock('ux_editor.properties_panel.images.validating_image_url_pending')),
  );
};

const clickDeleteImageButton = async (user: UserEvent) => {
  const deleteImageButton = screen.getByRole('button', {
    name: textMock('ux_editor.properties_panel.images.delete_image_reference_title'),
  });
  await user.click(deleteImageButton);
};

const renderEditImage = (
  imageComponent: FormItem<ComponentType.Image> = imageComponentMock,
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  queryClient.setQueryData([QueryKey.ImageFileNames, org, app], []);
  renderWithProviders(
    <EditImage component={imageComponent} handleComponentChange={handleComponentChangeMock} />,
    { ...queriesMock, ...queries, queryClient },
  );
};

import React from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getAttachmentsMock } from 'src/__mocks__/getAttachmentsMock';
import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { UploadedAttachment } from 'src/features/attachments';
import * as imageHooks from 'src/layout/ImageUpload/hooks/useImageFile';
import { ImageUploadComponent } from 'src/layout/ImageUpload/ImageUploadComponent';
import { renderGenericComponentTest, RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const attachmentsMock: UploadedAttachment[] = getAttachmentsMock({ count: 1, fileSize: 500 });

describe('ImageUploadComponent', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('should render label', async () => {
    await renderImageUploadComponent();
    expect(screen.getByText('mock.label')).toBeInTheDocument();
  });

  it('should render delete button when there is an stored image', async () => {
    jest.spyOn(imageHooks, 'useImageFile').mockReturnValue({
      storedImage: attachmentsMock[0],
      saveImage: jest.fn(),
      deleteImage: jest.fn(),
    });

    await renderImageUploadComponent();

    expect(screen.getByRole('button', { name: 'Slett bildet' })).toBeInTheDocument();
  });

  it('should render disabled delete button when there is an stored image and is readOnly', async () => {
    jest.spyOn(imageHooks, 'useImageFile').mockReturnValue({
      storedImage: attachmentsMock[0],
      saveImage: jest.fn(),
      deleteImage: jest.fn(),
    });
    await renderImageUploadComponent({ component: { readOnly: true } });
    const deleteButton = screen.getByRole('button', { name: 'Slett bildet' });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toBeDisabled();
  });

  it('should call to delete image when delete button is clicked', async () => {
    const user = userEvent.setup();
    const deleteImage = jest.fn();

    jest.spyOn(imageHooks, 'useImageFile').mockReturnValue({
      storedImage: attachmentsMock[0],
      saveImage: jest.fn(),
      deleteImage,
    });

    await renderImageUploadComponent();
    const deleteButton = screen.getByRole('button', { name: 'Slett bildet' });
    expect(deleteButton).toBeInTheDocument();
    await user.click(deleteButton);

    expect(deleteImage).toHaveBeenCalled();
  });

  it('should render validation message when the file are bigger than 10mb', async () => {
    await renderImageUploadComponent();

    const bigBuffer = new Uint8Array(11 * 1024 * 1024); // 11 MB
    const image = new File([bigBuffer], 'chucknorris.png', { type: 'image/png' });
    const dropzone = screen.getByRole('presentation').querySelector('input');
    await userEvent.upload(dropzone!, image);
    expect(screen.getByText('Filen er for stor. Største tillatte filstørrelse er 10MB.')).toBeInTheDocument();
  });
});

const renderImageUploadComponent = async ({
  component,
  ...rest
}: Partial<RenderGenericComponentTestProps<'ImageUpload'>> = {}) =>
  await renderGenericComponentTest({
    type: 'ImageUpload',
    renderer: (props) => <ImageUploadComponent {...props} />,
    component: {
      id: 'mock-id',
      required: false,
      textResourceBindings: {
        title: 'mock.label',
      },
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'some.field' },
      },
      ...component,
    },
    ...rest,
  });

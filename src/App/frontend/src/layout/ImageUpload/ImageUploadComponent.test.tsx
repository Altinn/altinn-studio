import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getAttachmentDataMock } from 'src/__mocks__/getAttachmentsMock';
import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { ImageUploadComponent } from 'src/layout/ImageUpload/ImageUploadComponent';
import { renderGenericComponentTest, RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const image = getAttachmentDataMock({ dataType: 'mock-id', size: 500, contentType: 'image/png' });

describe('ImageUploadComponent', () => {
  it('should render label', async () => {
    await renderImageUploadComponent();
    expect(screen.getByText('mock.label')).toBeInTheDocument();
  });

  it('should render delete button when there is an stored image', async () => {
    await renderImageUploadComponent({ withStoredImage: true });

    expect(screen.getByRole('button', { name: 'Slett bildet' })).toBeInTheDocument();
  });

  it('should render disabled delete button when there is an stored image and is readOnly', async () => {
    await renderImageUploadComponent({ withStoredImage: true, component: { readOnly: true } });
    const deleteButton = screen.getByRole('button', { name: 'Slett bildet' });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toBeDisabled();
  });

  it('should call to delete image when delete button is clicked', async () => {
    const user = userEvent.setup();
    const { mutations } = await renderImageUploadComponent({ withStoredImage: true });
    const deleteButton = screen.getByRole('button', { name: 'Slett bildet' });
    expect(deleteButton).toBeInTheDocument();
    await user.click(deleteButton);

    await waitFor(() =>
      expect(mutations.doAttachmentRemove.mock).toHaveBeenCalledWith(getInstanceWithProcessMock().id, image.id, 'nb'),
    );
    mutations.doAttachmentRemove.resolve();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Slett bildet' })).not.toBeInTheDocument());
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
  withStoredImage = false,
  ...rest
}: Partial<RenderGenericComponentTestProps<'ImageUpload'>> & { withStoredImage?: boolean } = {}) => {
  const instance = getInstanceWithProcessMock();
  if (withStoredImage) {
    instance.data.push(image);
    window.altinnAppGlobalData.applicationMetadata.dataTypes.push({
      id: image.dataType,
      allowedContentTypes: ['image/png'],
      maxCount: 1,
      minCount: 0,
    });
  }

  return renderGenericComponentTest({
    type: 'ImageUpload',
    instanceId: instance.id,
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
    queries: {
      getInstance: async () => instance,
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((bootstrap) => {
          bootstrap.dataModels[defaultDataTypeMock].initialData = {
            some: { field: withStoredImage ? image.id : undefined },
          };
        }),
    },
    ...rest,
  });
};

import React from 'react';

import { screen } from '@testing-library/react';

import { getAttachmentDataMock } from 'src/__mocks__/getAttachmentsMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { ImageUploadSummary2 } from 'src/layout/ImageUpload/ImageUploadSummary2/ImageUploadSummary2';
import { renderGenericComponentTest, RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const targetBaseComponentId = 'mock-id';
const image = getAttachmentDataMock({ dataType: targetBaseComponentId, size: 500, contentType: 'image/png' });

describe('ImageUploadSummary2', () => {
  it('renders label', async () => {
    await renderImageUploadSummary2();
    expect(screen.getByText('mock.label', { selector: 'span' })).toBeInTheDocument();
  });

  it('renders empty value text when no attachment', async () => {
    await renderImageUploadSummary2();
    expect(screen.getByText('Du har ikke lastet opp noe bilde')).toBeInTheDocument();
  });

  it('renders the required validation message', async () => {
    await renderImageUploadSummary2({
      required: true,
      component: { showValidations: ['Required'] },
    });
    expect(screen.getByText('Du må laste opp et bilde')).toBeInTheDocument();
  });

  it('renders image when attachment exists', async () => {
    await renderImageUploadSummary2({ withStoredImage: true });

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining(`/instances/${getInstanceWithProcessMock().id}/data/${image.id}?language=nb`),
    );
    expect(img).toHaveAttribute('alt', image.filename);
  });
});

const renderImageUploadSummary2 = async (
  props: Partial<RenderGenericComponentTestProps<'ImageUpload'>> & {
    required?: boolean;
    withStoredImage?: boolean;
  } = {},
) => {
  const { required = false, withStoredImage = false, component, ...rest } = props;
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
    renderer: (p) => (
      <ImageUploadSummary2
        {...p}
        targetBaseComponentId={targetBaseComponentId}
      />
    ),
    component: {
      id: targetBaseComponentId,
      required,
      textResourceBindings: { title: 'mock.label' },
      ...component,
    },
    queries: { getInstance: async () => instance },
    ...rest,
  });
};

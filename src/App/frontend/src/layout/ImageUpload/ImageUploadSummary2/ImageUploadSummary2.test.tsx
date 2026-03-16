import React from 'react';

import { screen } from '@testing-library/react';

import { getAttachmentsMock } from 'src/__mocks__/getAttachmentsMock';
import { UploadedAttachment } from 'src/features/attachments';
import * as useImageFile from 'src/layout/ImageUpload/hooks/useImageFile';
import { ImageUploadSummary2 } from 'src/layout/ImageUpload/ImageUploadSummary2/ImageUploadSummary2';
import { renderGenericComponentTest, RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const targetBaseComponentId = 'mock-id';

describe('ImageUploadSummary2', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('renders label', async () => {
    await renderImageUploadSummary2();
    expect(screen.getByText('mock.label', { selector: 'span' })).toBeInTheDocument();
  });

  it('renders empty value text when no attachment', async () => {
    await renderImageUploadSummary2();
    expect(screen.getByText('Du har ikke lastet opp noe bilde')).toBeInTheDocument();
  });

  it('renders image when attachment exists', async () => {
    const mockAttachment = getAttachmentsMock({ count: 1, fileSize: 500 })[0] as UploadedAttachment;
    jest.spyOn(useImageFile, 'useImageFile').mockReturnValue({
      storedImage: mockAttachment,
      imageUrl: 'https://mock.url/image.png',
      saveImage: jest.fn(),
      deleteImage: jest.fn(),
    });

    await renderImageUploadSummary2();

    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('https://mock.url/image.png');
    expect(img.alt).toBe(mockAttachment.data.filename);
  });
});

const renderImageUploadSummary2 = async (
  props: Partial<RenderGenericComponentTestProps<'ImageUpload'>> & { required?: boolean } = {},
) => {
  const { required = false, component, ...rest } = props;

  return renderGenericComponentTest({
    type: 'ImageUpload',
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
    ...rest,
  });
};

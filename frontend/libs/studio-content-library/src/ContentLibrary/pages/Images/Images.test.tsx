import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { Image, ImagesProps } from './Images';
import { Images } from './Images';

const onUpdateImageMock = jest.fn();
const imageMock: Image = {
  title: 'image',
  imageSrc: 'www.external-image-url.com',
};

describe('Images', () => {
  it('renders the images heading', () => {
    renderImages();
    const imagesHeading = screen.getByRole('heading', {
      name: textMock('app_content_library.images.page_name'),
    });
    expect(imagesHeading).toBeInTheDocument();
  });

  it('renders an alert when no images are passed', () => {
    renderImages({ images: [], onUpdateImage: onUpdateImageMock });
    const noImagesExistAlert = screen.getByText(textMock('app_content_library.images.no_content'));
    expect(noImagesExistAlert).toBeInTheDocument();
  });

  it('calls onUpdateImagesMock when clicking the button to update', async () => {
    const user = userEvent.setup();
    renderImages();
    const updateImageButton = screen.getByRole('button', { name: 'Oppdater bilde' });
    await user.click(updateImageButton);
    expect(onUpdateImageMock).toHaveBeenCalledTimes(1);
    expect(onUpdateImageMock).toHaveBeenCalledWith(imageMock);
  });
});

const defaultImagesProps: ImagesProps = {
  images: [imageMock],
  onUpdateImage: onUpdateImageMock,
};

const renderImages = (imagesProps: ImagesProps = defaultImagesProps) => {
  render(<Images {...imagesProps} />);
};

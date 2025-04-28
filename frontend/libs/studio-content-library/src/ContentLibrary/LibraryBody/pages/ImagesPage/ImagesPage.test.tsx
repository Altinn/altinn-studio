import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { Image, ImagesPageProps } from './ImagesPage';
import { ImagesPage } from './ImagesPage';

const onUpdateImageMock = jest.fn();
const imageMock: Image = {
  title: 'image',
  imageSrc: 'www.external-image-url.com',
};

describe('ImagesPage', () => {
  it('renders the images heading', () => {
    renderImages();
    const imagesHeading = screen.getByRole('heading', {
      name: textMock('app_content_library.images.page_name'),
    });
    expect(imagesHeading).toBeInTheDocument();
  });

  it('renders an alert when no images are passed', () => {
    renderImages({ images: [] });
    const alert = screen.getByText(textMock('app_content_library.images.coming_soon'));
    expect(alert).toBeInTheDocument();
  });

  it('renders an info box when no images are passed', () => {
    renderImages({ images: [] });
    const alert = screen.getByText(textMock('app_content_library.images.info_box.title'));
    expect(alert).toBeInTheDocument();
  });

  it('does not render an info box when images are passed', () => {
    renderImages();
    const alert = screen.queryByText(textMock('app_content_library.images.info_box.title'));
    expect(alert).not.toBeInTheDocument();
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

const defaultImagesProps: ImagesPageProps = {
  images: [imageMock],
  onUpdateImage: onUpdateImageMock,
};

const renderImages = (props: Partial<ImagesPageProps> = {}) => {
  render(<ImagesPage {...defaultImagesProps} {...props} />);
};

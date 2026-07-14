import React from 'react';

import { screen } from '@testing-library/react';

import { ImageComponent } from 'src/layout/Image/ImageComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { IImage } from 'src/layout/Image/config.generated';

describe('ImageComponent', () => {
  it('renders a plain <img> with the resolved source', async () => {
    const { container } = await render({
      image: { src: { nb: 'https://example.com/bilde.png' }, width: '100%', align: 'center' },
    });
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/bilde.png');
  });

  it('renders an <object> for svg sources', async () => {
    const { container } = await render({
      image: { src: { nb: 'https://example.com/bilde.svg' }, width: '100%', align: 'center' },
    });
    expect(container.querySelector('object')).toHaveAttribute('data', 'https://example.com/bilde.svg');
  });

  it('rewrites a wwwroot source to the app-relative path', async () => {
    const { container } = await render({
      image: { src: { nb: 'wwwroot/bilde.png' }, width: '100%', align: 'center' },
    });
    // window.org / window.app are 'ttd' / 'test' in the test setup.
    expect(container.querySelector('img')).toHaveAttribute('src', '/ttd/test/bilde.png');
  });

  it('renders the alt text from the text resource binding', async () => {
    await render({
      image: { src: { nb: 'https://example.com/bilde.png' }, width: '100%', align: 'center' },
      textResourceBindings: { altTextImg: 'Et bilde' },
    });
    expect(screen.getByRole('img', { name: 'Et bilde' })).toBeInTheDocument();
  });
});

const render = async ({
  image,
  textResourceBindings,
}: {
  image: IImage;
  textResourceBindings?: { altTextImg?: string; help?: string };
}) =>
  renderGenericComponentTest({
    type: 'Image',
    renderer: (props) => <ImageComponent {...props} />,
    component: {
      id: 'image-component',
      type: 'Image',
      image,
      textResourceBindings,
    },
  });

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { ImageLayout } from './ImageLayout';

const PNG_SRC = 'https://example.com/bilde.png';
const SVG_SRC = 'https://example.com/bilde.svg';

describe('ImageLayout', () => {
  it('renders a plain <img> with the resolved alt text for non-svg sources', () => {
    renderWithTranslations(<ImageLayout componentId='img' src={PNG_SRC} altText='my.alt' />, {
      overrides: { 'my.alt': 'Et bilde' },
    });
    const img = screen.getByRole('img', { name: 'Et bilde' });
    expect(img).toHaveAttribute('src', PNG_SRC);
    expect(img).toHaveAttribute('id', 'img');
  });

  it('renders an <object> (with fallback <img>) for svg sources', () => {
    const { container } = renderWithTranslations(
      <ImageLayout componentId='img' src={SVG_SRC} altText='my.alt' />,
      { overrides: { 'my.alt': 'Et bilde' } },
    );
    const object = container.querySelector('object#img');
    expect(object).toBeInTheDocument();
    expect(object).toHaveAttribute('data', SVG_SRC);
    expect(object?.querySelector('img')).toHaveAttribute('src', SVG_SRC);
  });

  it('applies the width to the image', () => {
    const { container } = renderWithTranslations(
      <ImageLayout componentId='img' src={PNG_SRC} width='50%' />,
    );
    expect(container.querySelector('img')).toHaveStyle({ width: '50%' });
  });

  it('renders a help button whose accessible name carries the resolved alt text', () => {
    renderWithTranslations(
      <ImageLayout componentId='img' src={PNG_SRC} altText='my.alt' help='my.help' />,
      { overrides: { 'my.alt': 'Et bilde', 'my.help': 'Hjelpetekst' } },
    );
    expect(screen.getByRole('button', { name: /Et bilde/i })).toBeInTheDocument();
  });

  it('does not render a help button when no help key is supplied', () => {
    renderWithTranslations(<ImageLayout componentId='img' src={PNG_SRC} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the form-content wrapper for the given componentId', () => {
    renderWithTranslations(<ImageLayout componentId='img-1' src={PNG_SRC} />);
    expect(document.getElementById('form-content-img-1')).toBeInTheDocument();
  });

  it('renders the bare image without a form-content wrapper or help when rendered in card media', () => {
    const { container } = renderWithTranslations(
      <ImageLayout
        componentId='img'
        src={PNG_SRC}
        help='my.help'
        renderedInCardMedia
        cardMediaHeight='200px'
      />,
      { overrides: { 'my.help': 'Hjelpetekst' } },
    );
    expect(document.getElementById('form-content-img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('img')).toHaveStyle({ height: '200px' });
  });
});

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';

import { Video } from './Video';

const src = { nb: 'nb.mp4', nn: 'nn.mp4', en: 'en.mp4' };

describe('Video', () => {
  it('renders a video element with source and captions track', () => {
    const { container } = renderWithTranslations(<Video componentId='v1' src={src} />);
    expect(container.querySelector('video')).toBeInTheDocument();
    expect(container.querySelector('source')).toBeInTheDocument();
    expect(container.querySelector('track[kind="captions"]')).toBeInTheDocument();
  });

  it('uses the source for the current language', () => {
    const { container } = renderWithTranslations(<Video componentId='v1' src={src} />, {
      language: 'nb',
    });
    expect(container.querySelector('source')).toHaveAttribute('src', 'nb.mp4');
    const track = container.querySelector('track');
    expect(track).toHaveAttribute('src', 'nb.mp4');
    expect(track).toHaveAttribute('srclang', 'nb');
  });

  it('falls back to an empty source when the current language has no url', () => {
    const { container } = renderWithTranslations(
      <Video componentId='v1' src={{ nb: 'nb.mp4' }} />,
      {
        language: 'en',
      },
    );
    expect(container.querySelector('source')?.getAttribute('src')).toBeFalsy();
  });

  it('resolves the altText key into the track label', () => {
    const { container } = renderWithTranslations(
      <Video componentId='v1' src={src} altText='my.alt' />,
      {
        overrides: { 'my.alt': 'Videobeskrivelse' },
      },
    );
    expect(container.querySelector('track')).toHaveAttribute('label', 'Videobeskrivelse');
  });

  it('applies the media height to the video element when provided', () => {
    const { container } = renderWithTranslations(
      <Video componentId='v1' src={src} mediaHeight={200} />,
    );
    expect(container.querySelector('video')).toHaveStyle({ height: '200px' });
  });

  it('renders the form-content wrapper for the given componentId', () => {
    renderWithTranslations(<Video componentId='video-1' src={src} />);
    expect(document.getElementById('form-content-video-1')).toBeInTheDocument();
  });
});

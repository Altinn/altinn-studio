import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';

import { Audio } from './Audio';

const src = { nb: 'nb.mp3', nn: 'nn.mp3', en: 'en.mp3' };

describe('Audio', () => {
  it('renders an audio element with source and captions track', () => {
    const { container } = renderWithTranslations(<Audio componentId='a1' src={src} />);
    expect(container.querySelector('audio')).toBeInTheDocument();
    expect(container.querySelector('source')).toBeInTheDocument();
    expect(container.querySelector('track[kind="captions"]')).toBeInTheDocument();
  });

  it('uses the source for the current language', () => {
    const { container } = renderWithTranslations(<Audio componentId='a1' src={src} />, {
      language: 'nb',
    });
    expect(container.querySelector('source')).toHaveAttribute('src', 'nb.mp3');
    const track = container.querySelector('track');
    expect(track).toHaveAttribute('src', 'nb.mp3');
    expect(track).toHaveAttribute('srclang', 'nb');
  });

  it('falls back to an empty source when the current language has no url', () => {
    const { container } = renderWithTranslations(
      <Audio componentId='a1' src={{ nb: 'nb.mp3' }} />,
      {
        language: 'en',
      },
    );
    expect(container.querySelector('source')?.getAttribute('src')).toBeFalsy();
  });

  it('resolves the altText key into the track label', () => {
    const { container } = renderWithTranslations(
      <Audio componentId='a1' src={src} altText='my.alt' />,
      {
        overrides: { 'my.alt': 'Lydbeskrivelse' },
      },
    );
    expect(container.querySelector('track')).toHaveAttribute('label', 'Lydbeskrivelse');
  });

  it('applies the media height to the audio element when provided', () => {
    const { container } = renderWithTranslations(
      <Audio componentId='a1' src={src} mediaHeight={200} />,
    );
    expect(container.querySelector('audio')).toHaveStyle({ height: '200px' });
  });

  it('renders the form-content wrapper for the given componentId', () => {
    renderWithTranslations(<Audio componentId='audio-1' src={src} />);
    expect(document.getElementById('form-content-audio-1')).toBeInTheDocument();
  });
});

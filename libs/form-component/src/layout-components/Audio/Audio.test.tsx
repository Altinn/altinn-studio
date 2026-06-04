import { type ReactNode } from 'react';

import { render } from '@testing-library/react';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { Audio } from './Audio';

interface Stubs {
  translate?: (key: string) => string;
}

const renderAudio = (ui: ReactNode, { translate }: Stubs = {}) =>
  render(
    <LanguageTranslatorProvider
      lang={(key) => key ?? null}
      translate={translate ?? ((key) => key)}
      TranslateComponent={({ tKey }) => <span>{tKey}</span>}
    >
      {ui}
    </LanguageTranslatorProvider>,
  );

const getAudio = (id: string) => document.getElementById(id) as HTMLAudioElement | null;

describe('Audio', () => {
  it('renders a controls audio element with the given id', () => {
    renderAudio(<Audio id='abc123' />);
    const audio = getAudio('abc123');
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('controls');
  });

  it('renders the source and caption track using the supplied src', () => {
    renderAudio(<Audio id='a' src='https://example.com/audio.mp3' />);
    const audio = getAudio('a');
    expect(audio?.querySelector('source')).toHaveAttribute('src', 'https://example.com/audio.mp3');
    const track = audio?.querySelector('track');
    expect(track).toHaveAttribute('kind', 'captions');
    expect(track).toHaveAttribute('src', 'https://example.com/audio.mp3');
  });

  it('resolves the altText key via the context and uses it as the track label', () => {
    renderAudio(<Audio id='a' src='x' altText='audio.alt' />, {
      translate: (key) => (key === 'audio.alt' ? 'Recording of the meeting' : key),
    });
    expect(getAudio('a')?.querySelector('track')).toHaveAttribute('label', 'Recording of the meeting');
  });

  it('does not set a track label when no altText is supplied', () => {
    renderAudio(<Audio id='a' src='x' />);
    expect(getAudio('a')?.querySelector('track')).not.toHaveAttribute('label');
  });

  it('passes the language code as the track srcLang', () => {
    renderAudio(<Audio id='a' src='x' srcLang='nn' />);
    expect(getAudio('a')?.querySelector('track')).toHaveAttribute('srclang', 'nn');
  });

  it('applies the media height when rendered inside a card', () => {
    renderAudio(<Audio id='a' src='x' mediaHeight='120px' />);
    expect(getAudio('a')).toHaveStyle({ height: '120px' });
  });
});

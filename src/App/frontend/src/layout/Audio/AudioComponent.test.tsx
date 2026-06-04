import React from 'react';

import { AudioComponent } from 'src/layout/Audio/Audio';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

describe('AudioComponent', () => {
  it('renders a controls audio element with the source for the current language', async () => {
    await render({
      component: {
        id: 'my-audio',
        audio: { src: { nb: 'https://example.com/nb.mp3', en: 'https://example.com/en.mp3' } },
      },
    });

    const audio = document.getElementById('my-audio') as HTMLAudioElement;
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('controls');
    // The default test profile language is 'nb', so the nb source is selected.
    expect(audio.querySelector('source')).toHaveAttribute('src', 'https://example.com/nb.mp3');
  });

  it('renders a captions track using the resolved alt text and the current language', async () => {
    await render({
      component: {
        id: 'my-audio',
        audio: { src: { nb: 'https://example.com/nb.mp3' } },
        textResourceBindings: { altText: 'A recording of the welcome message' },
      },
    });

    const track = document.getElementById('my-audio')?.querySelector('track');
    expect(track).toHaveAttribute('kind', 'captions');
    expect(track).toHaveAttribute('src', 'https://example.com/nb.mp3');
    expect(track).toHaveAttribute('srclang', 'nb');
    expect(track).toHaveAttribute('label', 'A recording of the welcome message');
  });

  it('does not fall back to another language when the current language has no source', async () => {
    await render({
      component: {
        id: 'my-audio',
        audio: { src: { en: 'https://example.com/en.mp3' } },
      },
    });

    // Current language is 'nb', which has no configured source, so the 'en' source is not used.
    const source = document.getElementById('my-audio')?.querySelector('source');
    expect(source).toBeInTheDocument();
    expect(source?.getAttribute('src')).toBeFalsy();
  });
});

const render = async ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'Audio'>> = {}) => {
  await renderGenericComponentTest({
    type: 'Audio',
    renderer: (props) => <AudioComponent {...props} />,
    component: {
      id: 'my-audio',
      type: 'Audio',
      ...component,
    },
    genericProps,
  });
};

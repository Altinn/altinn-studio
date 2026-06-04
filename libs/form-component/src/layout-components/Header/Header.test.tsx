import { type ReactNode } from 'react';

import { render, screen } from '@testing-library/react';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { Header } from './Header';

interface Stubs {
  lang?: (key: string | undefined) => ReactNode;
  translate?: (key: string) => string;
}

const renderHeader = (ui: ReactNode, { lang, translate }: Stubs = {}) =>
  render(
    <LanguageTranslatorProvider
      lang={lang ?? ((key) => key ?? null)}
      translate={translate ?? ((key) => key)}
      TranslateComponent={({ tKey }) => <span>{tKey}</span>}
    >
      {ui}
    </LanguageTranslatorProvider>,
  );

describe('Header', () => {
  it.each([
    ['L', 2],
    ['h2', 2],
    ['M', 3],
    ['h3', 3],
    ['S', 4],
    ['h4', 4],
  ] as const)('renders an h%s for size "%s"', (size, level) => {
    renderHeader(<Header id='h' title='my.title' size={size} />);
    expect(screen.getByRole('heading', { level })).toBeInTheDocument();
  });

  it('renders an h4 when no size is supplied', () => {
    renderHeader(<Header id='h' title='my.title' />);
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
  });

  it('resolves the title key via the context and renders it', () => {
    renderHeader(<Header id='h' title='my.title' />, {
      lang: (key) => (key === 'my.title' ? 'resolved title' : null),
    });
    expect(screen.getByRole('heading', { name: 'resolved title' })).toBeInTheDocument();
  });

  it('does not render a help button when no help key is supplied', () => {
    renderHeader(<Header id='h' title='x' />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a help button when a help key is supplied', () => {
    renderHeader(<Header id='h' title='x' help='my.help' />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('composes the help aria-label from the resolved title and the translated prefix', () => {
    renderHeader(<Header id='h' title='my.title' help='my.help' />, {
      translate: (key) => {
        if (key === 'my.title') {
          return 'My Title';
        }
        if (key === 'helptext.button_title_prefix') {
          return 'Help for';
        }
        return key;
      },
    });
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Help for My Title');
  });

  it('falls back to the button_title key for the aria-label when there is no title', () => {
    renderHeader(<Header id='h' help='my.help' />, {
      translate: (key) => (key === 'helptext.button_title' ? 'Help' : key),
    });
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Help');
  });
});

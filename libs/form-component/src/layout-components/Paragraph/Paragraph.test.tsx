import { type ReactNode } from 'react';

import { render, screen } from '@testing-library/react';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { Paragraph } from './Paragraph';

interface Stubs {
  lang?: (key: string | undefined) => ReactNode;
  translate?: (key: string) => string;
}

const renderParagraph = (ui: ReactNode, { lang, translate }: Stubs = {}) =>
  render(
    <LanguageTranslatorProvider
      lang={lang ?? ((key) => key ?? null)}
      translate={translate ?? ((key) => key)}
      TranslateComponent={({ tKey }) => <span>{tKey}</span>}
    >
      {ui}
    </LanguageTranslatorProvider>,
  );

describe('Paragraph', () => {
  it('resolves the title key via the context and renders it', () => {
    renderParagraph(<Paragraph id='p' title='my.title' />, {
      lang: (key) => (key === 'my.title' ? 'resolved title' : null),
    });
    expect(screen.getByText('resolved title')).toBeInTheDocument();
  });

  it('uses the id for the data-testid', () => {
    renderParagraph(<Paragraph id='abc123' title='x' />);
    expect(screen.getByTestId('paragraph-component-abc123')).toBeInTheDocument();
  });

  it('does not render a help button when no help key is supplied', () => {
    renderParagraph(<Paragraph id='p' title='x' />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a help button when a help key is supplied', () => {
    renderParagraph(<Paragraph id='p' title='x' help='my.help' />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('composes the help aria-label from the resolved title and the translated prefix', () => {
    renderParagraph(<Paragraph id='p' title='my.title' help='my.help' />, {
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
    renderParagraph(<Paragraph id='p' help='my.help' />, {
      translate: (key) => (key === 'helptext.button_title' ? 'Help' : key),
    });
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Help');
  });
});

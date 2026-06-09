import { type ReactNode } from 'react';

import { LanguageTranslatorProvider } from '@app/form-component/LanguageTranslatorProvider';
import { render, screen } from '@testing-library/react';

import { Paragraph } from './Paragraph';

interface Stubs {
  lang?: (key: string | undefined) => ReactNode;
  langAsString?: (key: string | undefined) => string;
}

const renderParagraph = (ui: ReactNode, { lang, langAsString }: Stubs = {}) =>
  render(
    <LanguageTranslatorProvider
      lang={lang ?? ((key) => key ?? null)}
      langAsString={langAsString ?? ((key) => key ?? '')}
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
      langAsString: (key) => {
        if (key === 'my.title') {
          return 'My Title';
        }
        if (key === 'helptext.button_title_prefix') {
          return 'Help for';
        }
        return key ?? '';
      },
    });
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Help for My Title');
  });

  it('falls back to the button_title key for the aria-label when there is no title', () => {
    renderParagraph(<Paragraph id='p' help='my.help' />, {
      langAsString: (key) => (key === 'helptext.button_title' ? 'Help' : (key ?? '')),
    });
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Help');
  });
});

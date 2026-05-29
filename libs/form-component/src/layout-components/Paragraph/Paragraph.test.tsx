import { type ReactElement } from 'react';

import { render, screen } from '@testing-library/react';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { Paragraph } from './Paragraph';

describe('Paragraph', () => {
  it('renders the supplied title content', () => {
    render(<Paragraph title='paragraph text content' />);
    expect(screen.getByText('paragraph text content')).toBeInTheDocument();
  });

  it('uses the id for the data-testid', () => {
    render(<Paragraph id='abc123' title='x' />);
    expect(screen.getByTestId('paragraph-component-abc123')).toBeInTheDocument();
  });

  it('does not render a help button when no help is supplied', () => {
    render(<Paragraph title='x' />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a help button when help is supplied', () => {
    render(<Paragraph id='h' title='x' help='some help' />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  describe('help button aria-label (translated inside the lib)', () => {
    const renderWithTranslation = (ui: ReactElement) =>
      render(
        <LanguageTranslatorProvider
          translate={(key) => `t:${key}`}
          TranslateComponent={({ tKey }) => tKey}
        >
          {ui}
        </LanguageTranslatorProvider>,
      );

    it('composes the prefix and the resolved title when titleText is present', () => {
      renderWithTranslation(<Paragraph id='h' title='My title' titleText='My title' help='help' />);
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        't:helptext.button_title_prefix My title',
      );
    });

    it('falls back to the button_title key when no titleText is present', () => {
      renderWithTranslation(<Paragraph id='h' help='help' />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 't:helptext.button_title');
    });
  });

  it('renders the raw key when no translator provider is mounted (identity default)', () => {
    render(<Paragraph id='h' help='help' />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'helptext.button_title');
  });
});

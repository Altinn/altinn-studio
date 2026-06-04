import { type ReactNode } from 'react';

import { render, screen } from '@testing-library/react';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { LanguageTranslatorProvider } from '../../LanguageTranslatorProvider';
import { Alert } from './Alert';
import type { AlertProps } from './Alert';

interface Stubs {
  lang?: (key: string | undefined) => ReactNode;
  translate?: (key: string) => string;
}

const renderAlert = (props: Partial<AlertProps> = {}, { lang, translate }: Stubs = {}) =>
  render(
    <LanguageTranslatorProvider
      lang={lang ?? ((key) => key ?? null)}
      translate={translate ?? ((key) => key)}
      TranslateComponent={({ tKey }) => <span>{tKey}</span>}
    >
      <Alert severity='info' {...props} />
    </LanguageTranslatorProvider>,
  );

describe('Alert', () => {
  it('resolves the title key via translate and renders it', () => {
    renderAlert(
      { title: 'my.title' },
      { translate: (key) => (key === 'my.title' ? 'resolved title' : key) },
    );
    expect(screen.getByText('resolved title')).toBeInTheDocument();
  });

  it('resolves the body key via lang and renders it', () => {
    renderAlert(
      { body: 'my.body' },
      { lang: (key) => (key === 'my.body' ? 'resolved body' : null) },
    );
    expect(screen.getByText('resolved body')).toBeInTheDocument();
  });

  it('does not render a title when no title key is supplied', () => {
    renderAlert({ body: 'my.body' });
    expect(screen.queryByText('my.title')).not.toBeInTheDocument();
  });

  it('exposes role="alert" with the resolved title as label when useAsAlert is set', () => {
    renderAlert(
      { title: 'my.title', useAsAlert: true },
      { translate: (key) => (key === 'my.title' ? 'Resolved Title' : key) },
    );
    expect(screen.getByRole('alert', { name: 'Resolved Title' })).toBeInTheDocument();
  });

  it('prefers an explicit ariaLabel over the title for the alert label', () => {
    renderAlert(
      { title: 'my.title', ariaLabel: 'Custom label', useAsAlert: true },
      { translate: (key) => (key === 'my.title' ? 'Resolved Title' : key) },
    );
    expect(screen.getByRole('alert', { name: 'Custom label' })).toBeInTheDocument();
  });

  it('does not expose role="alert" when useAsAlert is not set', () => {
    renderAlert({ title: 'my.title' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

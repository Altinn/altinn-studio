import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Link } from './Link';

describe('Link', () => {
  it('renders an anchor when style is link', () => {
    renderWithTranslations(
      <Link componentId='l1' style='link' title='Gå til Altinn' target='https://www.altinn.no' />,
    );
    expect(screen.getByRole('link', { name: 'Gå til Altinn' })).toBeInTheDocument();
  });

  it('renders a button when style is primary', () => {
    renderWithTranslations(
      <Link
        componentId='l1'
        style='primary'
        title='Start ny søknad'
        target='https://www.altinn.no'
      />,
    );
    expect(screen.getByRole('button', { name: 'Start ny søknad' })).toBeInTheDocument();
  });

  it('renders a button when style is secondary', () => {
    renderWithTranslations(
      <Link componentId='l1' style='secondary' title='Avbryt' target='https://www.altinn.no' />,
    );
    expect(screen.getByRole('button', { name: 'Avbryt' })).toBeInTheDocument();
  });

  it('sets target and rel when openInNewTab is true', () => {
    renderWithTranslations(
      <Link
        componentId='l1'
        style='link'
        title='Åpne tjenesten'
        target='https://www.altinn.no/tjeneste'
        openInNewTab
      />,
    );
    const link = screen.getByRole('link', { name: 'Åpne tjenesten' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveAttribute('href', 'https://www.altinn.no/tjeneste');
    expect(link).not.toHaveAttribute('download');
  });

  it('omits target, rel and download when openInNewTab is false and no download', () => {
    renderWithTranslations(
      <Link
        componentId='l1'
        style='link'
        title='Åpne tjenesten'
        target='https://www.altinn.no/tjeneste'
      />,
    );
    const link = screen.getByRole('link', { name: 'Åpne tjenesten' });
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
    expect(link).toHaveAttribute('href', 'https://www.altinn.no/tjeneste');
    expect(link).not.toHaveAttribute('download');
  });

  it('sets the download attribute when download is a non-blank value', () => {
    renderWithTranslations(
      <Link
        componentId='l1'
        style='link'
        title='Last ned skjema'
        target='https://www.altinn.no/skjema.pdf'
        download='skjema.pdf'
      />,
    );
    expect(screen.getByRole('link', { name: 'Last ned skjema' })).toHaveAttribute(
      'download',
      'skjema.pdf',
    );
  });

  it('renders the form-content wrapper for the given componentId', () => {
    renderWithTranslations(
      <Link
        componentId='link-1'
        style='link'
        title='Gå til Altinn'
        target='https://www.altinn.no'
      />,
    );
    expect(document.getElementById('form-content-link-1')).toBeInTheDocument();
  });
});

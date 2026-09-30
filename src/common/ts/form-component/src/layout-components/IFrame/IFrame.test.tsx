import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';

import { IFrame } from './IFrame';

describe('IFrame', () => {
  it('renders an iframe whose srcdoc is the resolved title content', () => {
    const { container } = renderWithTranslations(
      <IFrame componentId='if1' title='<p>Hei verden</p>' />,
    );
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('srcdoc', '<p>Hei verden</p>');
  });

  it('resolves a text-resource key into the srcdoc', () => {
    const { container } = renderWithTranslations(<IFrame componentId='if1' title='my.iframe' />, {
      overrides: { 'my.iframe': '<h1>Fra tekstressurs</h1>' },
    });
    expect(container.querySelector('iframe')).toHaveAttribute(
      'srcdoc',
      '<h1>Fra tekstressurs</h1>',
    );
  });

  it('applies the default sandbox attribute when no options are set', () => {
    const { container } = renderWithTranslations(<IFrame componentId='if1' title='<p>x</p>' />);
    expect(container.querySelector('iframe')).toHaveAttribute('sandbox', 'allow-same-origin');
  });

  it('adds sandbox tokens for enabled options', () => {
    const { container } = renderWithTranslations(
      <IFrame componentId='if1' title='<p>x</p>' sandbox={{ allowPopups: true }} />,
    );
    expect(container.querySelector('iframe')).toHaveAttribute(
      'sandbox',
      'allow-same-origin allow-popups',
    );
  });

  it('renders the form-content wrapper for the given componentId', () => {
    renderWithTranslations(<IFrame componentId='iframe-1' title='<p>x</p>' />);
    expect(document.getElementById('form-content-iframe-1')).toBeInTheDocument();
  });
});

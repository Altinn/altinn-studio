import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { InstanceInformation } from './InstanceInformation';

const summary = {
  Avsender: { value: 'Ola Nordmann' },
  Mottaker: { value: 'Digdir' },
  'Dato sendt': { value: '23.07.2026', hideFromVisualTesting: true },
};

describe('InstanceInformation', () => {
  it('renders summary rows for the given data', () => {
    renderWithTranslations(<InstanceInformation componentId='ii-1' summaryDataObject={summary} />);
    expect(screen.getByText('Avsender:')).toBeInTheDocument();
    expect(screen.getByText('Ola Nordmann')).toBeInTheDocument();
    expect(screen.getByText('Mottaker:')).toBeInTheDocument();
    expect(screen.getByText('Digdir')).toBeInTheDocument();
  });

  it('marks rows that should be hidden from visual testing', () => {
    const { container } = renderWithTranslations(
      <InstanceInformation componentId='ii-1' summaryDataObject={summary} />,
    );
    const hiddenCell = container.querySelector('.no-visual-testing');
    expect(hiddenCell).toHaveTextContent('23.07.2026');
  });

  it('renders the form-content wrapper for the given componentId', () => {
    renderWithTranslations(<InstanceInformation componentId='ii-1' summaryDataObject={summary} />);
    expect(document.getElementById('form-content-ii-1')).toBeInTheDocument();
  });

  it('renders a fieldset legend when a title key is supplied', () => {
    renderWithTranslations(
      <InstanceInformation componentId='ii-1' title='my.title' summaryDataObject={summary} />,
      { overrides: { 'my.title': 'Informasjon om innsendingen' } },
    );
    expect(screen.getByText('Informasjon om innsendingen')).toBeInTheDocument();
  });

  it('renders description and help when keys are supplied', () => {
    renderWithTranslations(
      <InstanceInformation
        componentId='ii-1'
        title='my.title'
        description='my.desc'
        help='my.help'
        summaryDataObject={summary}
      />,
      {
        overrides: {
          'my.title': 'Informasjon',
          'my.desc': 'Hentet fra innsendingen',
          'my.help': 'Bruk referansen ved kontakt',
        },
      },
    );
    expect(screen.getByText('Hentet fra innsendingen')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

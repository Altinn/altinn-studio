import type { ComponentProps } from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { renderWithTranslations } from '../../test/renderWithTranslations';
import { SingleValueSummaryLayout } from './SingleValueSummaryLayout';
import { SummaryEditButton } from './SummaryEditButton';

const overrides = {
  'summary.title': 'Fornavn',
  'summary.description': 'Slik det står i folkeregisteret',
  'summary.help': 'Skriv alle fornavnene dine',
  'summary.empty': 'Ikke oppgitt',
};

const render = (props?: Partial<ComponentProps<typeof SingleValueSummaryLayout>>) =>
  renderWithTranslations(<SingleValueSummaryLayout title='summary.title' {...props} />, {
    overrides,
  });

describe('SingleValueSummaryLayout', () => {
  it('renders the label and the value', () => {
    render({ value: 'Kari' });
    expect(screen.getByText('Fornavn')).toBeInTheDocument();
    expect(screen.getByText('Kari')).toBeInTheDocument();
  });

  it('renders the default empty text when there is no value', () => {
    render();
    expect(screen.getByText('You have not entered any information here')).toBeInTheDocument();
  });

  it('renders the given empty text when there is no value', () => {
    render({ emptyFieldText: 'summary.empty' });
    expect(screen.getByText('Ikke oppgitt')).toBeInTheDocument();
  });

  it('puts a colon after the label when compact', () => {
    render({ value: 'Kari', compact: true });
    expect(screen.getByText('Fornavn').closest('label')).toHaveTextContent('Fornavn:');
  });

  it('renders the description and the help text', async () => {
    render({ description: 'summary.description', help: 'summary.help' });
    expect(screen.getByText('Slik det står i folkeregisteret')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Fornavn/ }));
    expect(await screen.findByText('Skriv alle fornavnene dine')).toBeInTheDocument();
  });

  it('leaves out the description and the help text when showLabelMetadata is false', () => {
    render({ description: 'summary.description', help: 'summary.help', showLabelMetadata: false });
    expect(screen.queryByText('Slik det står i folkeregisteret')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the edit button and the validation messages it is given', () => {
    render({
      editButton: <button>Endre</button>,
      validationMessages: <span>Du må fylle ut fornavn</span>,
    });
    expect(screen.getByRole('button', { name: 'Endre' })).toBeInTheDocument();
    expect(screen.getByText('Du må fylle ut fornavn')).toBeInTheDocument();
  });
});

describe('SummaryEditButton', () => {
  it('calls onClick and points at the target', () => {
    const onClick = vi.fn();
    renderWithTranslations(
      <SummaryEditButton onClick={onClick} title='summary.title' targetId='fornavn-0' />,
      { overrides },
    );
    const button = screen.getByRole('button', { name: /Edit/ });
    expect(button).toHaveAttribute('data-target-id', 'fornavn-0');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });
});

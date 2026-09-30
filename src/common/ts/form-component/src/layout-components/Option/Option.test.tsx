import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Option } from './Option';

describe('Option', () => {
  it('renders only the option label when no title is set', () => {
    renderWithTranslations(<Option componentId='option-1' optionLabel='Hund' />);
    expect(screen.getByText('Hund')).toBeInTheDocument();
    expect(document.getElementById('form-content-option-1')).not.toBeInTheDocument();
  });

  it('renders the title, option label and the form-content wrapper when a title is set', () => {
    renderWithTranslations(<Option componentId='option-1' title='my.title' optionLabel='Hund' />, {
      overrides: { 'my.title': 'Dyreart' },
    });
    expect(screen.getByText('Dyreart')).toBeInTheDocument();
    expect(screen.getByText('Hund')).toBeInTheDocument();
    expect(document.getElementById('form-content-option-1')).toBeInTheDocument();
  });

  it('links the displayed option to the title for screen readers', () => {
    renderWithTranslations(<Option componentId='option-1' title='my.title' optionLabel='Hund' />, {
      overrides: { 'my.title': 'Dyreart' },
    });
    const labeled = document.querySelector('[aria-labelledby="label-option-1"]');
    expect(labeled).toBeInTheDocument();
    expect(labeled).toHaveTextContent('Hund');
    expect(document.getElementById('label-option-1')).toBeInTheDocument();
  });

  it('renders option help and description when supplied', () => {
    renderWithTranslations(
      <Option
        componentId='option-1'
        title='my.title'
        optionLabel='Hund'
        optionHelp='my.optionHelp'
        optionDescription='my.optionDesc'
      />,
      {
        overrides: {
          'my.title': 'Dyreart',
          'my.optionHelp': 'Hjelp for verdi',
          'my.optionDesc': 'Beskrivelse for verdi',
        },
      },
    );
    expect(screen.getByText('Beskrivelse for verdi')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows a loading state while options are fetching', () => {
    const { container } = renderWithTranslations(
      <Option componentId='option-1' title='my.title' isLoading optionLabel='Hund' />,
      { overrides: { 'my.title': 'Dyreart' } },
    );
    expect(screen.getByText('Dyreart')).toBeInTheDocument();
    expect(screen.queryByText('Hund')).not.toBeInTheDocument();
    expect(container.querySelector('#form-content-option-1')).toBeInTheDocument();
  });
});

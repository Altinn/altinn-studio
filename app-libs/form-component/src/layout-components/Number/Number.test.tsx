import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Number } from './Number';

describe('Number', () => {
  it('shows the number value', () => {
    renderWithTranslations(<Number componentId='number-1' value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows the title when provided', () => {
    renderWithTranslations(<Number componentId='number-1' title='my.title' value={42} />, {
      overrides: { 'my.title': 'Antall' },
    });
    expect(screen.getByText('Antall')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the form-content wrapper when a title is set', () => {
    renderWithTranslations(<Number componentId='number-preview' title='my.title' value={42} />, {
      overrides: { 'my.title': 'Antall' },
    });
    expect(document.getElementById('form-content-number-preview')).toBeInTheDocument();
  });
});

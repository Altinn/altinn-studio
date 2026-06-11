import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { Datepicker } from './Datepicker';

const baseProps = {
  id: 'my-datepicker',
  value: '2025-03-15',
  format: 'dd.MM.yyyy',
  locale: 'en',
  onValueChange: () => {},
};

describe('Datepicker', () => {
  it('renders the input with the formatted value', () => {
    renderWithTranslations(<Datepicker {...baseProps} />);
    expect(screen.getByRole('textbox')).toHaveValue('15.03.2025');
  });

  it('resolves the calendar button aria-label via the translation context', () => {
    renderWithTranslations(<Datepicker {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Open date picker' })).toBeInTheDocument();
  });

  it('renders a read-only input when readOnly is set', () => {
    renderWithTranslations(<Datepicker {...baseProps} readOnly />);
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });
});

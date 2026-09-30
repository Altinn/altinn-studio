import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Datepicker } from './Datepicker';

const render = (
  props?: Partial<ComponentProps<typeof Datepicker>>,
  options?: Parameters<typeof renderWithTranslations>[1],
) =>
  renderWithTranslations(
    <Datepicker componentId='my-datepicker' value='' onValueChange={() => {}} {...props} />,
    options,
  );

describe('Datepicker', () => {
  it('renders the input with the formatted value', () => {
    render({ value: '2025-03-15', format: 'dd.MM.yyyy' });
    expect(screen.getByRole('textbox')).toHaveValue('15.03.2025');
  });

  it('resolves the calendar button aria-label via the translation context', () => {
    render();
    expect(screen.getByRole('button', { name: 'Open date picker' })).toBeInTheDocument();
  });

  it('calls onValueChange when a date is picked from the calendar', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render({ value: '2025-03-15', format: 'dd.MM.yyyy', timeStamp: false, onValueChange });

    await user.click(screen.getByRole('button', { name: 'Open date picker' }));
    await user.click(screen.getByRole('button', { name: 'Thursday, March 20th, 2025' }));

    expect(onValueChange).toHaveBeenLastCalledWith('2025-03-20');
  });

  it('renders a read-only input when readOnly is set', () => {
    render({ readOnly: true });
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });

  it('renders the label and associates it with the input', () => {
    render({ title: 'date.label' }, { overrides: { 'date.label': 'Date of birth' } });
    expect(screen.getByLabelText('Date of birth')).toBe(screen.getByRole('textbox'));
  });

  it('renders no label when no label title is provided', () => {
    render();
    expect(screen.queryByText('Date of birth')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders the validation messages passed in by the app', () => {
    render({ validationMessages: 'You must enter a valid date.' });
    expect(screen.getByText('You must enter a valid date.')).toBeInTheDocument();
  });

  it('calls onValueChange with the ISO date string when a valid date is typed', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render({ format: 'dd.MM.yyyy', timeStamp: false, onValueChange });

    await user.type(screen.getByRole('textbox'), '15.03.2025');

    expect(onValueChange).toHaveBeenLastCalledWith('2025-03-15');
  });
});

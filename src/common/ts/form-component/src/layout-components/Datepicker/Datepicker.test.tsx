import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen, waitFor } from '@testing-library/react';
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

  it('mounts a calendar only while it is open and restores input focus after selection', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render({ value: '2025-03-15', format: 'dd.MM.yyyy', onValueChange });
    expect(screen.queryByRole('grid', { hidden: true })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open date picker' }));
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { selected: true })).toHaveTextContent('15');
    await user.click(screen.getByRole('button', { name: 'Thursday, March 20th, 2025' }));

    expect(onValueChange).toHaveBeenLastCalledWith('2025-03-20');
    expect(screen.queryByRole('grid', { hidden: true })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'Open date picker' }));
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('keeps month/year selection and date limits available after lazy opening', async () => {
    const user = userEvent.setup();
    render({ value: '2025-03-15', minDate: '2025-03-10', maxDate: '2026-04-20' });
    await user.click(screen.getByRole('button', { name: 'Open date picker' }));
    expect(screen.getByRole('button', { name: 'Sunday, March 9th, 2025' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Monday, March 10th, 2025' })).toBeEnabled();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Select year' }), '2026');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Select month' }), '3');
    expect(screen.getByRole('button', { name: 'Tuesday, April 21st, 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Monday, April 20th, 2026' })).toBeEnabled();
  });

  it('preserves invalid typed dates on blur without mounting a calendar', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render({ format: 'dd.MM.yyyy', onValueChange });
    await user.type(screen.getByRole('textbox'), '31.02.2025');
    await user.tab();
    expect(screen.getByRole('textbox')).toHaveValue('31.02.2025');
    expect(onValueChange).toHaveBeenLastCalledWith('31.02.2025');
    expect(screen.queryByRole('grid', { hidden: true })).not.toBeInTheDocument();
  });

  it('does not open a calendar for a readonly field', async () => {
    const user = userEvent.setup();
    render({ value: '2025-03-15', readOnly: true });
    const button = screen.getByRole('button', { name: 'Open date picker' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(screen.queryByRole('grid', { hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });
});

import type { ComponentProps } from 'react';

import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { TimePickerLayout } from './TimePickerLayout';

const render = (
  props?: Partial<ComponentProps<typeof TimePickerLayout>>,
  options?: Parameters<typeof renderWithTranslations>[1],
) =>
  renderWithTranslations(
    <TimePickerLayout id='my-timepicker' value='' onChange={() => {}} {...props} />,
    options,
  );

describe('TimePickerLayout', () => {
  it('renders the time picker input segments', () => {
    render({ format: 'HH:mm' });
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(2);
  });

  it('renders with 12-hour format including AM/PM segment', () => {
    render({ format: 'hh:mm a' });
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
  });

  it('renders with seconds when format includes seconds', () => {
    render({ format: 'HH:mm:ss' });
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
  });

  it('renders the label from a title text resource key', () => {
    render({ title: 'my.title' }, { overrides: { 'my.title': 'Select time' } });
    expect(screen.getByText('Select time')).toBeInTheDocument();
  });

  it('renders no label when title is undefined', () => {
    render({ title: undefined }, { overrides: { 'my.title': 'Select time' } });
    expect(screen.queryByText('Select time')).not.toBeInTheDocument();
  });

  it('renders a description when provided', () => {
    render(
      { title: 'my.title', description: 'my.desc' },
      { overrides: { 'my.title': 'Select time', 'my.desc': 'Pick a time' } },
    );
    expect(screen.getByText('Pick a time')).toBeInTheDocument();
  });

  it('renders help text when provided', () => {
    render(
      { title: 'my.title', help: 'my.help' },
      { overrides: { 'my.title': 'Select time', 'my.help': 'Help text' } },
    );
    expect(screen.getByRole('button', { name: /Select time/ })).toBeInTheDocument();
  });

  it('renders validation messages when provided', () => {
    render({ validationMessages: <span>Error msg</span> });
    expect(screen.getByText('Error msg')).toBeInTheDocument();
  });

  it('does not render validation area when validationMessages is undefined', () => {
    render({ componentId: 'tp-1' });
    const formContent = document.getElementById('form-content-tp-1');
    expect(formContent).toBeInTheDocument();
    expect(formContent?.children).toHaveLength(1);
  });

  it('renders form-content wrapper when componentId is set', () => {
    render({ componentId: 'tp-1' });
    expect(document.getElementById('form-content-tp-1')).toBeInTheDocument();
  });

  it('does not render form-content wrapper when componentId is undefined', () => {
    const { container } = render();
    expect(container.querySelector('[id^="form-content-"]')).not.toBeInTheDocument();
  });

  it('disables inputs when readOnly is true', () => {
    render({ readOnly: true });
    screen.getAllByRole('textbox').forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it('resolves segment aria-labels via translation context', () => {
    render(
      { format: 'HH:mm' },
      { overrides: { 'timepicker.hours': 'Hours label', 'timepicker.minutes': 'Minutes label' } },
    );
    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveAttribute('aria-label', 'Hours label');
    expect(inputs[1]).toHaveAttribute('aria-label', 'Minutes label');
  });
});

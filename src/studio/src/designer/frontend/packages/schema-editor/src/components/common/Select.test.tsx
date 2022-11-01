import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectProps, Select } from './Select';
import { Option } from '../SchemaInspector/helpers/options';

const user = userEvent.setup();

// Test data:
const id = 'select-id';
const label = 'select-label';
const onChange = jest.fn();
const options: Option[] = [
  {label: 'Option 1', value: 'option1'},
  {label: 'Option 2', value: 'option2'}
];
const defaultProps: SelectProps = { id, label, onChange, options, value: 'option1' };

const renderSelect = (props?: Partial<SelectProps>) => render(<Select {...defaultProps} {...props} />);

test('Label appears', () => {
  renderSelect();
  expect(screen.getByText(label)).toBeDefined();
});

test('Select box appears', () => {
  renderSelect();
  expect(screen.getByRole('combobox')).toBeDefined();
});

test('All options appear', () => {
  renderSelect();
  expect(screen.queryAllByRole('option')).toHaveLength(options.length);
  options.forEach((option) => expect(screen.getByRole('option', { name: option.label })).toBeDefined());
});

test('Given value should be selected', () => {
  const { value } = options[1];
  renderSelect({ value });
  expect(screen.getByRole('combobox')).toHaveValue(value);
});

test('onChange handler should be called when selecting another option', async () => {
  renderSelect({ value: options[0].value });
  await user.selectOptions(screen.getByRole('combobox'), options[1].value);
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith(options[1].value);
});

test('Select box should have given ID', () => {
  const { container } = renderSelect();
  expect(container.querySelector(`#${id}`)).toBeDefined();
});

test('Select box should get focus when clicking on label', async () => {
  renderSelect();
  await user.click(screen.getByText(label));
  expect(screen.getByRole('combobox')).toHaveFocus();
});

test('Empty value option should appear with given label if set', async () => {
  const emptyOptionLabel = 'Empty';
  renderSelect({ emptyOptionLabel });
  expect(screen.getByText(emptyOptionLabel)).toHaveValue('');
});

test('If hideLabel is true, the label should not be visible, but still accessible', () => {
  renderSelect({ hideLabel: true });
  expect(screen.queryByText(label)).toBeFalsy();
  expect(screen.getByRole('combobox')).toHaveAccessibleName(label);
});

test('Select box should have given class', () => {
  const className = 'test';
  const { container } = renderSelect({ className });
  expect(container.querySelector(`.${className}`)).toBeDefined();
});

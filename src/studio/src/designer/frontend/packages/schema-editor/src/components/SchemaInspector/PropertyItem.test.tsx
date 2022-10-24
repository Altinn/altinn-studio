import React from 'react';
import { screen } from '@testing-library/react';
import { IPropertyItemProps, PropertyItem } from './PropertyItem';
import { renderWithRedux } from '../../../test/renderWithRedux';

// Test data:
const textRequired = 'Required';
const textDelete = 'Delete';
const fullPath = 'test';
const inputId = 'some-random-id';
const value = '';
const mockLanguage = {
  schema_editor: {
    delete_field: textDelete,
    required: textRequired,
  },
};
const defaultProps: IPropertyItemProps = {
  fullPath,
  inputId,
  language: mockLanguage,
  onChangeValue: jest.fn(),
  onDeleteField: jest.fn(),
  onEnterKeyPress: jest.fn(),
  value,
};

const renderPropertyItem = (props?: Partial<IPropertyItemProps>) =>
  renderWithRedux(<PropertyItem {...defaultProps} {...props} />);

test('Text input field appears', () => {
  renderPropertyItem();
  expect(screen.getByRole('textbox')).toBeDefined();
});

test('Text input field has the value given in the "value" prop', () => {
  const value = 'Lorem ipsum';
  renderPropertyItem({ value });
  expect(screen.getByRole('textbox')).toHaveValue(value);
});

test('Text input field is not disabled by default', () => {
  renderPropertyItem();
  expect(screen.getByRole('textbox')).not.toBeDisabled();
});

test('Text input field is disabled when the "readOnly" prop is true', () => {
  renderPropertyItem({ readOnly: true });
  expect(screen.getByRole('textbox')).toBeDisabled();
});

test('Text input field is not disabled when the "readOnly" prop is false', () => {
  renderPropertyItem({ readOnly: false });
  expect(screen.getByRole('textbox')).not.toBeDisabled();
});

test('onChangeValue is called on blur when text changes', async () => {
  const onChangeValue = jest.fn();
  const { user } = renderPropertyItem({ onChangeValue });
  await user.type(screen.getByRole('textbox'), 'test');
  await user.tab();
  expect(onChangeValue).toHaveBeenCalledTimes(1);
});

test('onChangeValue is not called when there is no change', async () => {
  const onChangeValue = jest.fn();
  const { user } = renderPropertyItem({ onChangeValue });
  await user.click(screen.getByRole('textbox'));
  await user.tab();
  expect(onChangeValue).not.toHaveBeenCalled();
});

test('onEnterKeyPress is called when the Enter key is pressed in the input field', async () => {
  const onEnterKeyPress = jest.fn();
  const { user } = renderPropertyItem({ onEnterKeyPress });
  const textbox = screen.getByRole('textbox');
  await user.click(textbox);
  await user.keyboard('{Enter}');
  expect(onEnterKeyPress).toHaveBeenCalled();
});

test('onEnterKeyPress is not called when another key but Enter is pressed in the input field', async () => {
  const onEnterKeyPress = jest.fn();
  const { user } = renderPropertyItem({ onEnterKeyPress });
  const textbox = screen.getByRole('textbox');
  await user.click(textbox);
  await user.keyboard('a');
  expect(onEnterKeyPress).not.toHaveBeenCalled();
});

test('Name input field has given id', async () => {
  const { container } = renderPropertyItem().renderResult;
  expect(container.querySelector(`#${inputId}`)).toBeDefined();
});

test('"Required" checkbox appears', () => {
  renderPropertyItem();
  expect(screen.getByRole('checkbox')).toBeDefined();
});

test('"Required" checkbox is not checked by default', () => {
  renderPropertyItem();
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

test('"Required" checkbox is checked when "required" prop is true', () => {
  renderPropertyItem({ required: true });
  expect(screen.getByRole('checkbox')).toBeChecked();
});

test('"Required" checkbox is not checked when "required" prop is false', () => {
  renderPropertyItem({ required: false });
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

test('"Required" label appears on screen', () => {
  renderPropertyItem();
  expect(screen.getByText(textRequired)).toBeDefined();
});

test('"Required" checkbox is enabled by default', () => {
  renderPropertyItem();
  expect(screen.getByRole('checkbox')).toBeEnabled();
});

test('"Required" checkbox is disabled if the "readOnly" prop is true', () => {
  renderPropertyItem({ readOnly: true });
  expect(screen.getByRole('textbox')).toBeDisabled();
});

test('"Required" checkbox is enabled if the "readOnly" prop is false', () => {
  renderPropertyItem({ readOnly: false });
  expect(screen.getByRole('checkbox')).toBeEnabled();
});

test('Delete button appears', () => {
  renderPropertyItem();
  expect(screen.getByRole('button')).toBeDefined();
});

test('onDeleteField is called when the delete button is clicked', async () => {
  const onDeleteField = jest.fn();
  const { user } = renderPropertyItem({ onDeleteField });
  await user.click(screen.getByRole('button'));
  expect(onDeleteField).toHaveBeenCalledTimes(1);
});

test('Delete button is labelled with the delete text', async () => {
  renderPropertyItem();
  expect(screen.getByRole('button')).toHaveAccessibleName(textDelete);
});

import { screen } from '@testing-library/react';
import React from 'react';
import { IPropertyItemProps, PropertyItem } from './PropertyItem';
import { renderWithRedux } from '../../../test/renderWithRedux';

// Test data:
const textRequired = 'Required';
const textDelete = 'Delete';
const mockLanguage = {
  schema_editor: {
    required: textRequired,
    delete_field: textDelete
  }
};

const renderPropertyItem = (props?: Partial<IPropertyItemProps>) => renderWithRedux(
  <PropertyItem
    fullPath='test'
    language={mockLanguage}
    onChangeValue={jest.fn}
    value=''
    {...props}
  />
);

test('Text input field appears', () => {
  renderPropertyItem();
  expect(screen.getByRole('textbox')).toBeDefined();
});

test('Text input field has the value given in the "value" prop', () => {
  const value = 'Lorem ipsum';
  renderPropertyItem({value});
  expect(screen.getByRole('textbox')).toHaveValue(value);
});

test('Text input field is not disabled by default', () => {
  renderPropertyItem();
  expect(screen.getByRole('textbox')).not.toBeDisabled();
});

test('Text input field is disabled when the "readOnly" prop is true', () => {
  renderPropertyItem({readOnly: true});
  expect(screen.getByRole('textbox')).toBeDisabled();
});

test('Text input field is not disabled when the "readOnly" prop is false', () => {
  renderPropertyItem({readOnly: false});
  expect(screen.getByRole('textbox')).not.toBeDisabled();
});

test('onChangeValue is called on blur when text changes', async () => {
  const onChangeValue = jest.fn();
  const {user} = renderPropertyItem({onChangeValue});
  await user.type(screen.getByRole('textbox'), 'test');
  await user.tab();
  expect(onChangeValue).toHaveBeenCalled();
});

test('onChangeValue is not called when there is no change', async () => {
  const onChangeValue = jest.fn();
  const {user} = renderPropertyItem({onChangeValue});
  await user.click(screen.getByRole('textbox'));
  await user.tab();
  expect(onChangeValue).not.toHaveBeenCalled();
});

test('onEnterKeyPress is called when the Enter key is pressed in the input field', async () => {
  const onEnterKeyPress = jest.fn();
  const {user} = renderPropertyItem({onEnterKeyPress});
  const textbox = screen.getByRole('textbox');
  await user.click(textbox);
  await user.keyboard('{Enter}');
  expect(onEnterKeyPress).toHaveBeenCalled();
});

test('onEnterKeyPress is not called when another key but Enter is pressed in the input field', async () => {
  const onEnterKeyPress = jest.fn();
  const {user} = renderPropertyItem({onEnterKeyPress});
  const textbox = screen.getByRole('textbox');
  await user.click(textbox);
  await user.keyboard('a');
  expect(onEnterKeyPress).not.toHaveBeenCalled();
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
  renderPropertyItem({required: true});
  expect(screen.getByRole('checkbox')).toBeChecked();
});

test('"Required" checkbox is not checked when "required" prop is false', () => {
  renderPropertyItem({required: false});
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

test('"Required" label appears on screen', () => {
  renderPropertyItem();
  expect(screen.getByText(textRequired)).toBeDefined();
});

test('Delete button does not appear by default', () => {
  renderPropertyItem();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});

test('Delete button appears if onDeleteField is defined', () => {
  renderPropertyItem({onDeleteField: jest.fn});
  expect(screen.getByRole('button')).toBeDefined();
});

test('onDeleteField is called when the delete button is clicked', async () => {
  const onDeleteField = jest.fn();
  const {user} = renderPropertyItem({onDeleteField});
  await user.click(screen.getByRole('button'));
  expect(onDeleteField).toHaveBeenCalled();
});

test('Delete button is labelled with the delete text', async () => {
  renderPropertyItem({onDeleteField: jest.fn});
  expect(screen.getByRole('button')).toHaveAccessibleName(textDelete);
});

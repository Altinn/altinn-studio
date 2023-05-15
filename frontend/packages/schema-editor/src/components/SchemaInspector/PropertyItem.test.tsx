import React from 'react';
import { act, screen } from '@testing-library/react';
import type { IPropertyItemProps } from './PropertyItem';
import { PropertyItem } from './PropertyItem';
import { renderWithRedux } from '../../../test/renderWithRedux';
import { FieldType } from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';

// Test data:
const textDeleteField = 'Slett felt';
const textFieldName = 'Navn på felt';
const textRequired = 'Påkrevd';
const textType = 'Type';
const fullPath = 'test';
const inputId = 'some-random-id';
const type = FieldType.String;
const value = '';
const fieldTypeNames = {
  [FieldType.Boolean]: 'Ja/nei',
  [FieldType.Integer]: 'Helt tall',
  [FieldType.Number]: 'Desimaltall',
  [FieldType.Object]: 'Objekt',
  [FieldType.String]: 'Tekst',
};
const texts = {
  'schema_editor.delete_field': textDeleteField,
  'schema_editor.field_name': textFieldName,
  'schema_editor.required': textRequired,
  'schema_editor.type': textType,
  'schema.editor.number': fieldTypeNames[FieldType.Number],
  'schema_editor.boolean': fieldTypeNames[FieldType.Boolean],
  'schema_editor.integer': fieldTypeNames[FieldType.Integer],
  'schema_editor.object': fieldTypeNames[FieldType.Object],
  'schema_editor.string': fieldTypeNames[FieldType.String],
};
const defaultProps: IPropertyItemProps = {
  fullPath,
  inputId,
  onChangeType: jest.fn(),
  onChangeValue: jest.fn(),
  onDeleteField: jest.fn(),
  onEnterKeyPress: jest.fn(),
  type,
  value,
};

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

const renderPropertyItem = (props?: Partial<IPropertyItemProps>) =>
  renderWithRedux(<PropertyItem {...defaultProps} {...props} />);

describe('PropertyItem', () => {
  test('Text input field appears', async () => {
    renderPropertyItem();
    expect(await screen.findByLabelText(textFieldName)).toBeDefined();
  });

  test('Text input field has the value given in the "value" prop', async () => {
    const inputValue = 'Lorem ipsum';
    renderPropertyItem({ value: inputValue });
    expect(await screen.findByLabelText(textFieldName)).toHaveValue(inputValue);
  });

  test('Text input field is not disabled by default', async () => {
    renderPropertyItem();
    expect(await screen.findByLabelText(textFieldName)).not.toBeDisabled();
  });

  test('Text input field is disabled when the "readOnly" prop is true', async () => {
    renderPropertyItem({ readOnly: true });
    expect(await screen.findByLabelText(textFieldName)).toBeDisabled();
  });

  test('Text input field is not disabled when the "readOnly" prop is false', async () => {
    renderPropertyItem({ readOnly: false });
    expect(await screen.findByLabelText(textFieldName)).not.toBeDisabled();
  });

  test('Text input field is correctly labelled', async () => {
    renderPropertyItem();
    expect(await screen.findByLabelText(textFieldName)).toHaveAccessibleName(textFieldName);
  });

  test('onChangeValue is called on blur when text changes', async () => {
    const onChangeValue = jest.fn();
    const { user } = renderPropertyItem({ onChangeValue });
    await act(() => user.type(screen.getByLabelText(textFieldName), 'test'));
    await act(() => user.tab());
    expect(onChangeValue).toHaveBeenCalledTimes(1);
  });

  test('onChangeValue is not called when there is no change', async () => {
    const onChangeValue = jest.fn();
    const { user } = renderPropertyItem({ onChangeValue });
    await act(() => user.click(screen.getByLabelText(textFieldName)));
    await act(() => user.tab());
    expect(onChangeValue).not.toHaveBeenCalled();
  });

  test('onEnterKeyPress is called when the Enter key is pressed in the input field', async () => {
    const onEnterKeyPress = jest.fn();
    const { user } = renderPropertyItem({ onEnterKeyPress });
    const textbox = screen.getByLabelText(textFieldName);
    await act(() => user.click(textbox));
    await act(() => user.keyboard('{Enter}'));
    expect(onEnterKeyPress).toHaveBeenCalled();
  });

  test('onEnterKeyPress is not called when another key but Enter is pressed in the input field', async () => {
    const onEnterKeyPress = jest.fn();
    const { user } = renderPropertyItem({ onEnterKeyPress });
    const textbox = screen.getByLabelText(textFieldName);
    await act(() => user.click(textbox));
    await act(() => user.keyboard('a'));
    expect(onEnterKeyPress).not.toHaveBeenCalled();
  });

  test('Name input field has given id', async () => {
    renderPropertyItem();
    expect(await screen.findByLabelText(textFieldName)).toHaveAttribute('id', inputId);
  });

  test('Given type is selected', async () => {
    renderPropertyItem();
    expect(await screen.findByRole('combobox')).toHaveValue(fieldTypeNames[type]);
  });

  test('onChangeType is called with correct parameters when type changes', async () => {
    const onChangeType = jest.fn();
    const { user } = renderPropertyItem({ onChangeType });
    const newType = FieldType.Integer;
    await act(() => user.click(screen.getByRole('combobox')));
    await act(() => user.click(screen.getByRole('option', { name: fieldTypeNames[newType] })));
    expect(onChangeType).toHaveBeenCalledTimes(1);
    expect(onChangeType).toHaveBeenCalledWith(fullPath, newType);
  });

  test('"Type" select box is correctly labelled', async () => {
    renderPropertyItem();
    expect(await screen.findByRole('combobox')).toHaveAccessibleName(textType);
  });

  test('"Required" checkbox appears', async () => {
    renderPropertyItem();
    expect(await screen.findByRole('checkbox')).toBeDefined();
  });

  test('"Required" checkbox is not checked by default', async () => {
    renderPropertyItem();
    expect(await screen.findByRole('checkbox')).not.toBeChecked();
  });

  test('"Required" checkbox is checked when "required" prop is true', async () => {
    renderPropertyItem({ required: true });
    expect(await screen.findByRole('checkbox')).toBeChecked();
  });

  test('"Required" checkbox is not checked when "required" prop is false', async () => {
    renderPropertyItem({ required: false });
    expect(await screen.findByRole('checkbox')).not.toBeChecked();
  });

  test('"Required" checkbox is enabled by default', async () => {
    renderPropertyItem();
    expect(await screen.findByRole('checkbox')).toBeEnabled();
  });

  test('"Required" checkbox is disabled if the "readOnly" prop is true', async () => {
    renderPropertyItem({ readOnly: true });
    expect(await screen.findByRole('checkbox')).toBeDisabled();
  });

  test('"Required" checkbox is enabled if the "readOnly" prop is false', async () => {
    renderPropertyItem({ readOnly: false });
    expect(await screen.findByRole('checkbox')).toBeEnabled();
  });

  test('"Required" checkbox is correctly labelled', async () => {
    renderPropertyItem();
    expect(await screen.findByRole('checkbox')).toHaveAccessibleName(textRequired);
  });

  test('Delete button appears', async () => {
    renderPropertyItem();
    expect(await screen.findByRole('button', { name: textDeleteField })).toBeDefined();
  });

  test('onDeleteField is called when the delete button is clicked', async () => {
    const onDeleteField = jest.fn();
    const { user } = renderPropertyItem({ onDeleteField });
    const deleteButton = await screen.findByRole('button', { name: textDeleteField });
    await act(() => user.click(deleteButton));
    expect(onDeleteField).toHaveBeenCalledTimes(1);
  });
});

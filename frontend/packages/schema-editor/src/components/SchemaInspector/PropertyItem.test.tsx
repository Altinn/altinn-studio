import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import type { IPropertyItemProps } from './PropertyItem';
import { PropertyItem } from './PropertyItem';
import { FieldType } from '@altinn/schema-model';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import { queryClientMock } from '../../../test/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import {
  parentNodeMock,
  toggableNodeMock,
  uiSchemaNodesMock
} from '../../../test/mocks/uiSchemaMock';
import { SchemaState } from '@altinn/schema-editor/types';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const modelPath = 'test';
const saveDatamodel = jest.fn();
const textDeleteField = 'Slett felt';
const textConfirmDeleteDialog = 'Confirm';
const textCancelDeleteDialog = 'Cancel';
const fieldDeletionText = 'Text';
const fieldDeletionInfo = 'Info';
const textFieldName = 'Navn på felt';
const textRequired = 'Påkrevd';
const textType = 'Type';
const fullPath = parentNodeMock.pointer;
const inputId = 'some-random-id';
const type = FieldType.String;
const fieldTypeNames = {
  [FieldType.Boolean]: 'Ja/nei',
  [FieldType.Integer]: 'Helt tall',
  [FieldType.Number]: 'Desimaltall',
  [FieldType.Object]: 'Objekt',
  [FieldType.String]: 'Tekst',
};
const texts = {
  'schema_editor.delete_field': textDeleteField,
  'schema_editor.datamodel_field_deletion_confirm': textConfirmDeleteDialog,
  'schema_editor.datamodel_field_deletion_text': fieldDeletionText,
  'schema_editor.datamodel_field_deletion_info': fieldDeletionInfo,
  'general.cancel': textCancelDeleteDialog,
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
  onDeleteField: jest.fn(),
  onEnterKeyPress: jest.fn(),
  type,
};
const defaultState: Partial<SchemaState> = {
  selectedEditorTab: 'properties',
  selectedPropertyNodeId: parentNodeMock.pointer,
};

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

const renderPropertyItem = (
  props?: Partial<IPropertyItemProps>,
  state: Partial<SchemaState> = {}
) => {
  queryClientMock.setQueryData(
    [QueryKey.Datamodel, org, app, modelPath],
    uiSchemaNodesMock,
  );

  return renderWithProviders({
    state: { ...defaultState, ...state },
    appContextProps: { modelPath },
    servicesContextProps: { saveDatamodel },
  })(<PropertyItem {...defaultProps} {...props} />);
};

describe('PropertyItem', () => {
  afterEach(() => jest.clearAllMocks());

  test('Text input field appears', async () => {
    renderPropertyItem();
    expect(await screen.findByLabelText(textFieldName)).toBeDefined();
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

  test('Model is saved on blur when text changes', async () => {
    renderPropertyItem({}, { selectedPropertyNodeId: toggableNodeMock.pointer });
    await act(() => user.type(screen.getByLabelText(textFieldName), 'test'));
    await act(() => user.tab());
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });

  test('Model is not saved when there is no change', async () => {
    renderPropertyItem({}, { selectedPropertyNodeId: toggableNodeMock.pointer });
    await act(() => user.click(screen.getByLabelText(textFieldName)));
    await act(() => user.tab());
    expect(saveDatamodel).not.toHaveBeenCalled();
  });

  test('onEnterKeyPress is called when the Enter key is pressed in the input field', async () => {
    const onEnterKeyPress = jest.fn();
    renderPropertyItem({ onEnterKeyPress });
    const textbox = screen.getByLabelText(textFieldName);
    await act(() => user.click(textbox));
    await act(() => user.keyboard('{Enter}'));
    expect(onEnterKeyPress).toHaveBeenCalled();
  });

  test('onEnterKeyPress is not called when another key but Enter is pressed in the input field', async () => {
    const onEnterKeyPress = jest.fn();
    renderPropertyItem({ onEnterKeyPress });
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
    renderPropertyItem({ onChangeType });
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

  describe('Delete confirmation dialog', () => {
    afterEach(jest.clearAllMocks);

    it('should open the confirmation dialog when clicking the delete button', async () => {
      renderPropertyItem();

      const deleteButton = screen.getByRole('button', { name: textDeleteField });
      await act(() => user.click(deleteButton));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const text = await screen.findByText(fieldDeletionText);
      expect(text).toBeInTheDocument();

      const information = await screen.findByText(fieldDeletionInfo);
      expect(information).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: textConfirmDeleteDialog });
      expect(confirmButton).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: textCancelDeleteDialog });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should confirm and close the dialog when clicking the confirm button', async () => {
      const onDeleteField = jest.fn();
      renderPropertyItem({ onDeleteField });

      const deleteButton = screen.getByRole('button', { name: textDeleteField });
      await act(() => user.click(deleteButton));

      const confirmButton = screen.getByRole('button', { name: textConfirmDeleteDialog });
      await act(() => user.click(confirmButton));

      expect(onDeleteField).toBeCalledWith('test', '');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close the confirmation dialog when clicking the cancel button', async () => {
      const onDeleteField = jest.fn();
      renderPropertyItem({ onDeleteField });

      const deleteButton = screen.getByRole('button', { name: textDeleteField });
      await act(() => user.click(deleteButton));

      const cancelButton = screen.getByRole('button', { name: textCancelDeleteDialog });
      await act(() => user.click(cancelButton));

      expect(onDeleteField).toBeCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('should close when clicking outside the popover', async () => {
      const onDeleteField = jest.fn();
      renderPropertyItem({ onDeleteField });

      const deleteButton = screen.getByRole('button', { name: textDeleteField });
      await act(() => user.click(deleteButton));

      await act(() => user.click(document.body));

      expect(onDeleteField).toBeCalledTimes(0);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });
});

import React from 'react';
import { screen } from '@testing-library/react';
import type { ItemFieldsTableProps } from './ItemFieldsTable';
import { ItemFieldsTable } from './ItemFieldsTable';
import type { FieldNode, UiSchemaNodes } from '@altinn/schema-model/index';
import {
  extractNameFromPointer,
  FieldType,
  ObjectKind,
  SchemaModel,
  validateTestUiSchema,
} from '@altinn/schema-model/index';
import type { RenderWithProvidersData } from '../../../../../test/renderWithProviders';
import { renderWithProviders } from '../../../../../test/renderWithProviders';
import { nodeMockBase, rootNodeMock } from '../../../../../test/mocks/uiSchemaMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const selectedItemPointer = '#/properties/test';
const selectedItemChildPointer = '#/properties/test/properties/testProperty';
const rootNode = {
  ...rootNodeMock,
  children: [selectedItemPointer],
};
const selectedItem: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  schemaPointer: selectedItemPointer,
  fieldType: FieldType.Object,
  children: [selectedItemChildPointer],
};
const selectedItemChild: FieldNode = {
  ...nodeMockBase,
  schemaPointer: selectedItemChildPointer,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  children: [],
};
const uiSchema: UiSchemaNodes = [rootNode, selectedItem, selectedItemChild];
const saveDataModel = jest.fn();
const model = SchemaModel.fromArray(uiSchema);

const defaultProps: ItemFieldsTableProps = {
  readonly: false,
  selectedItem,
};

const renderItemFieldsTab = (
  props: Partial<ItemFieldsTableProps> = {},
  data: Partial<RenderWithProvidersData> = {},
) =>
  renderWithProviders({
    ...data,
    appContextProps: {
      schemaModel: model,
      save: saveDataModel,
      ...data.appContextProps,
    },
  })(<ItemFieldsTable {...defaultProps} {...props} />);

describe('ItemFieldsTable', () => {
  beforeAll(() => {
    validateTestUiSchema(uiSchema);
  });

  afterEach(jest.clearAllMocks);

  it('render inputs and delete buttons correctly for all fields', async () => {
    const user = userEvent.setup();
    renderItemFieldsTab();
    const textboxes = screen.getAllByRole('textbox', {
      name: textMock('schema_editor.field_name'),
    });
    const children = model.getChildNodes(selectedItemPointer);
    expect(textboxes).toHaveLength(children.length);
    textboxes.forEach((textbox, i) => expect(textbox).toHaveValue(expectedNameInTextField(i)));
    expect(screen.getAllByRole('checkbox')).toHaveLength(children.length);
    expect(
      screen.getAllByRole('button', {
        name: textMock('schema_editor.delete_field'),
      }),
    ).toHaveLength(children.length);

    await user.tab();
  });

  it('Updates the text field correctly', async () => {
    const user = userEvent.setup();
    renderItemFieldsTab();

    const [firstTextBox] = screen.getAllByRole('textbox', {
      name: textMock('schema_editor.field_name'),
    });
    expect(firstTextBox).toHaveValue(expectedNameInTextField(0));

    await user.type(firstTextBox, 'a');
    await user.tab();

    const [firstTextBoxAfter] = screen.getAllByLabelText(textMock('schema_editor.field_name'));
    expect(firstTextBoxAfter).toHaveValue(expectedNameInTextField(0) + 'a');

    expect(saveDataModel).toHaveBeenCalledTimes(1);
  });

  it('Calls "save" when "Enter" key is pressed in Text field', async () => {
    const user = userEvent.setup();
    renderItemFieldsTab();

    const [firstTextBox] = screen.getAllByLabelText(textMock('schema_editor.field_name'));
    expect(firstTextBox).toHaveValue(expectedNameInTextField(0));

    await user.type(firstTextBox, 'a');
    await user.keyboard('{Enter}');

    expect(saveDataModel).toHaveBeenCalledTimes(1);
  });

  it('Updates the switch correctly', async () => {
    const user = userEvent.setup();
    renderItemFieldsTab();

    const [firstSwitch] = screen.getAllByLabelText(textMock('schema_editor.required'));
    expect(firstSwitch).not.toBeChecked();

    await user.click(firstSwitch);

    expect(saveDataModel).toHaveBeenCalledTimes(1);
  });

  it('Calls "save" when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderItemFieldsTab();

    const children = model.getChildNodes(selectedItemPointer);
    const lastIndex = children.length - 1;
    const lastDeleteButton = screen.getAllByRole('button', {
      name: textMock('schema_editor.delete_field'),
    })[lastIndex];
    await user.click(lastDeleteButton);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', {
      name: textMock('schema_editor.data_model_field_deletion_confirm'),
    });
    await user.click(confirmButton);
    expect(saveDataModel).toHaveBeenCalledTimes(1);
  });
});

const expectedNameInTextField = (pos: number): string => {
  const schemaPointer = selectedItem.children[pos]; // eslint-disable-line testing-library/no-node-access
  return extractNameFromPointer(schemaPointer);
};

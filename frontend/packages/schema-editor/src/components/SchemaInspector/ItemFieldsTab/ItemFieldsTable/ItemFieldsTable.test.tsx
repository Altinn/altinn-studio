import React from 'react';
import { act, screen, within } from '@testing-library/react';
import { ItemFieldsTable, ItemFieldsTableProps } from './ItemFieldsTable';
import {
  extractNameFromPointer,
  FieldNode,
  FieldType,
  ObjectKind,
  SchemaModel,
  UiSchemaNodes,
} from '@altinn/schema-model';
import {
  renderWithProviders,
  RenderWithProvidersData,
} from '../../../../../test/renderWithProviders';
import { nodeMockBase, rootNodeMock } from '../../../../../test/mocks/uiSchemaMock';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { validateTestUiSchema } from '../../../../../../schema-model';

const selectedItemPointer = '#/properties/test';
const selectedItemChildPointer = '#/properties/test/properties/testProperty';
const rootNode = {
  ...rootNodeMock,
  children: [selectedItemPointer],
};
const selectedItem: FieldNode = {
  ...nodeMockBase,
  objectKind: ObjectKind.Field,
  pointer: selectedItemPointer,
  fieldType: FieldType.Object,
  children: [selectedItemChildPointer],
};
const selectedItemChild: FieldNode = {
  ...nodeMockBase,
  pointer: selectedItemChildPointer,
  objectKind: ObjectKind.Field,
  fieldType: FieldType.Object,
  children: [],
};
const uiSchema: UiSchemaNodes = [rootNode, selectedItem, selectedItemChild];
const saveDatamodel = jest.fn();
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
      save: saveDatamodel,
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

    // Added to avoid the "Warning: An update to Select inside a test was not wrapped in act(...)." bug
    await act(() => user.tab());
  });

  it('Updates the text field correctly', async () => {
    const user = userEvent.setup();
    renderItemFieldsTab();

    const [firstTextBox] = screen.getAllByRole('textbox', {
      name: textMock('schema_editor.field_name'),
    });
    expect(firstTextBox).toHaveValue(expectedNameInTextField(0));

    await act(() => user.type(firstTextBox, 'a'));
    await act(() => user.tab());

    const [firstTextBoxAfter] = screen.getAllByLabelText(textMock('schema_editor.field_name'));
    expect(firstTextBoxAfter).toHaveValue(expectedNameInTextField(0) + 'a');

    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });

  it('Calls "save" when "Enter" key is pressed in Text field', async () => {
    const user = userEvent.setup();
    renderItemFieldsTab();

    const [firstTextBox] = screen.getAllByLabelText(textMock('schema_editor.field_name'));
    expect(firstTextBox).toHaveValue(expectedNameInTextField(0));

    await act(() => user.type(firstTextBox, 'a'));
    await act(() => user.keyboard('{Enter}'));

    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });

  it('Updates the select correctly', async () => {
    const user = userEvent.setup();
    renderItemFieldsTab();

    const [firstSelect] = screen.getAllByRole('combobox', { name: textMock('schema_editor.type') });
    const objectOption = within(firstSelect).getByRole('option', {
      name: textMock('schema_editor.object'),
    }) as HTMLOptionElement;
    expect(objectOption.selected).toBe(true);

    await act(() => user.selectOptions(firstSelect, textMock('schema_editor.string')));

    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });

  it('Updates the switch correctly', async () => {
    const user = userEvent.setup();
    renderItemFieldsTab();

    const [firstSwitch] = screen.getAllByLabelText(textMock('schema_editor.required'));
    expect(firstSwitch).not.toBeChecked();

    await act(() => user.click(firstSwitch));

    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });

  it('Calls "save" when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderItemFieldsTab();

    const children = model.getChildNodes(selectedItemPointer);
    const lastIndex = children.length - 1;
    const lastDeleteButton = screen.getAllByRole('button', {
      name: textMock('schema_editor.delete_field'),
    })[lastIndex];
    await act(() => user.click(lastDeleteButton));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', {
      name: textMock('schema_editor.datamodel_field_deletion_confirm'),
    });
    await act(() => user.click(confirmButton));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });
});

const expectedNameInTextField = (pos: number): string => {
  const pointer = selectedItem.children[pos]; // eslint-disable-line testing-library/no-node-access
  return extractNameFromPointer(pointer);
};

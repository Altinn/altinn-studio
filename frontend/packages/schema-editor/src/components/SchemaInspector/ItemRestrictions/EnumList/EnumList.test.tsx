import React from 'react';
import { screen, act } from '@testing-library/react';
import type { EnumListProps } from './EnumList';
import { EnumList } from './EnumList';
import { fieldNode1Mock, uiSchemaNodesMock } from '../../../../../test/mocks/uiSchemaMock';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../test/renderWithProviders';
import type { FieldNode } from '../../../../../../schema-model';
import { SchemaModel } from '../../../../../../schema-model';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

const mockEnums: string[] = ['a', 'b', 'c'];

const defaultProps: EnumListProps = {
  schemaNode: fieldNode1Mock,
};
const mockSaveDataModel = jest.fn();

describe('EnumList', () => {
  beforeEach(jest.clearAllMocks);

  it('renders the description about enum being empty when there is no enums on the field node', () => {
    renderEnumList();

    expect(screen.getByText(textMock('schema_editor.enum_empty'))).toBeInTheDocument();
  });

  it('renders EnumList component with existing enum values', () => {
    renderEnumList({ schemaNode: { ...fieldNode1Mock, enum: mockEnums } });

    expect(screen.queryByText(textMock('schema_editor.enum_empty'))).not.toBeInTheDocument();

    const enumLabelA = screen.getByRole('textbox', {
      name: textMock('schema_editor.enum_value', { index: 0 }),
    });
    expect(enumLabelA).toBeInTheDocument();
    const enumLabelB = screen.getByRole('textbox', {
      name: textMock('schema_editor.enum_value', { index: 1 }),
    });
    expect(enumLabelB).toBeInTheDocument();
    const enumLabelC = screen.getByRole('textbox', {
      name: textMock('schema_editor.enum_value', { index: 2 }),
    });
    expect(enumLabelC).toBeInTheDocument();
  });

  it('handles adding a new enum value', async () => {
    const user = userEvent.setup();
    renderEnumList();

    const addEnumButton = screen.getByRole('button', { name: textMock('schema_editor.add_enum') });
    await act(() => user.click(addEnumButton));

    const enumLabel = screen.getByRole('textbox', {
      name: textMock('schema_editor.enum_value', { index: 0 }),
    });
    expect(enumLabel).toBeInTheDocument();
    expect(mockSaveDataModel).not.toHaveBeenCalled();
  });

  it('handles deleting an enum value correctly', async () => {
    const user = userEvent.setup();
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    renderEnumList({ schemaNode: { ...fieldNode1Mock, enum: mockEnums } }, schemaModel);

    const allDeleteButtons = screen.getAllByRole('button', {
      name: textMock('schema_editor.delete_field'),
    });
    expect(allDeleteButtons).toHaveLength(3);

    const [, deleteEnumButtonB] = screen.getAllByRole('button', {
      name: textMock('schema_editor.delete_field'),
    });
    await act(() => user.click(deleteEnumButtonB));

    const allDeleteButtonsAfter = screen.getAllByRole('button', {
      name: textMock('schema_editor.delete_field'),
    });
    expect(allDeleteButtonsAfter).toHaveLength(2);
  });

  it('displays error message when having duplicates, and removes error message when error is fixed and saves the schema model', async () => {
    const user = userEvent.setup();
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    const mockSchemaNode = { schemaNode: { ...fieldNode1Mock, enum: mockEnums } };
    renderEnumList(mockSchemaNode, schemaModel);

    const addEnumButton = screen.getByRole('button', { name: textMock('schema_editor.add_enum') });
    await act(() => user.click(addEnumButton));
    expect(mockSaveDataModel).not.toHaveBeenCalled();

    const newEnumInput = screen.getByRole('textbox', {
      name: textMock('schema_editor.enum_value', { index: 3 }),
    });

    await act(() => user.type(newEnumInput, 'a'));

    const errorMessage = screen.getByText(textMock('schema_editor.enum_error_duplicate'));
    expect(errorMessage).toBeInTheDocument();
    expect(mockSaveDataModel).not.toHaveBeenCalled();

    await act(() => user.type(newEnumInput, 'a'));

    const errorMessageAfter = screen.queryByText(textMock('schema_editor.enum_error_duplicate'));
    expect(errorMessageAfter).not.toBeInTheDocument();

    expect(mockSaveDataModel).toHaveBeenCalledTimes(1);
    expect(mockSaveDataModel).toHaveBeenCalledWith(schemaModel);

    const updatedNode: FieldNode = schemaModel.getNode(fieldNode1Mock.pointer) as FieldNode;
    const updatedEnum: string[] = updatedNode.enum;

    const expectedEnum: string[] = ['a', 'b', 'c', 'aa'];
    expect(updatedEnum).toEqual(expectedEnum);
  });

  it('updates an enum correctly when values are changed', async () => {
    const user = userEvent.setup();
    const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock).deepClone();
    const mockSchemaNode = { schemaNode: { ...fieldNode1Mock, enum: mockEnums } };
    renderEnumList(mockSchemaNode, schemaModel);

    const enumFieldB = screen.getByRole('textbox', {
      name: textMock('schema_editor.enum_value', { index: 1 }),
    });
    expect(enumFieldB).toHaveValue('b');

    await act(() => user.type(enumFieldB, 'x'));

    expect(mockSaveDataModel).toHaveBeenCalledTimes(1);
    expect(mockSaveDataModel).toHaveBeenCalledWith(schemaModel);

    const updatedNode: FieldNode = schemaModel.getNode(fieldNode1Mock.pointer) as FieldNode;
    const updatedEnum: string[] = updatedNode.enum;

    const expectedEnum: string[] = ['a', 'bx', 'c'];
    expect(updatedEnum).toEqual(expectedEnum);

    const enumFieldBAfter = screen.getByRole('textbox', {
      name: textMock('schema_editor.enum_value', { index: 1 }),
    });
    expect(enumFieldBAfter).toHaveValue('bx');
  });
});

const renderEnumList = (props?: Partial<EnumListProps>, schemaModel?: SchemaModel) =>
  renderWithProviders({
    appContextProps: {
      schemaModel: schemaModel,
      save: mockSaveDataModel,
    },
  })(<EnumList {...defaultProps} {...props} />);

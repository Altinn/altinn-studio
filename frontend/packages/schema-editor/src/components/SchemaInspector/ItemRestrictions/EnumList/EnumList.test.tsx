import React from 'react';
import { screen, act } from '@testing-library/react';
import { EnumList, EnumListProps } from './EnumList';
import { fieldNode1Mock, uiSchemaNodesMock } from '../../../../../test/mocks/uiSchemaMock';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../test/renderWithProviders';
import { SchemaModel } from '../../../../../../schema-model';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

const mockEnums: string[] = ['a', 'b', 'c'];

const defaultProps: EnumListProps = {
  schemaNode: fieldNode1Mock,
};
const mockSaveDataModel = jest.fn();

describe('EnumList', () => {
  afterAll(jest.clearAllMocks);

  it('renders the description about enum being empty when there is no enums on the field node', () => {
    renderItemRestrictions();

    expect(screen.getByText(textMock('schema_editor.enum_empty'))).toBeInTheDocument();
  });

  it('renders EnumList component with existing enum values', () => {
    renderItemRestrictions({ schemaNode: { ...fieldNode1Mock, enum: mockEnums } });

    expect(screen.queryByText(textMock('schema_editor.enum_empty'))).not.toBeInTheDocument();

    const enumLabelA = screen.getByLabelText(textMock('schema_editor.enum_value', { index: 0 }));
    expect(enumLabelA).toBeInTheDocument();
    const enumLabelB = screen.getByLabelText(textMock('schema_editor.enum_value', { index: 1 }));
    expect(enumLabelB).toBeInTheDocument();
    const enumLabelC = screen.getByLabelText(textMock('schema_editor.enum_value', { index: 2 }));
    expect(enumLabelC).toBeInTheDocument();
  });

  it('handles adding a new enum value', async () => {
    const user = userEvent.setup();
    renderItemRestrictions();

    const addEnumButton = screen.getByRole('button', { name: textMock('schema_editor.add_enum') });
    await act(() => user.click(addEnumButton));

    const enumLabel = screen.getByLabelText(textMock('schema_editor.enum_value', { index: 0 }));
    expect(enumLabel).toBeInTheDocument();
    expect(mockSaveDataModel).toHaveBeenCalledTimes(1);
  });

  it('handles deleting an enum value correctly', async () => {
    const user = userEvent.setup();
    renderItemRestrictions({ schemaNode: { ...fieldNode1Mock, enum: mockEnums } });

    const allDeleteButtons = screen.getAllByRole('button', {
      name: textMock('schema_editor.delete_field'),
    });
    expect(allDeleteButtons.length).toBe(3);

    const [, deleteEnumButtonB] = screen.getAllByRole('button', {
      name: textMock('schema_editor.delete_field'),
    });
    await act(() => user.click(deleteEnumButtonB));

    const allDeleteButtonsAfter = screen.getAllByRole('button', {
      name: textMock('schema_editor.delete_field'),
    });
    expect(allDeleteButtonsAfter.length).toBe(2);
  });

  it('displays error message when two or more enums have the same value', async () => {
    const user = userEvent.setup();
    renderItemRestrictions({ schemaNode: { ...fieldNode1Mock, enum: mockEnums } });

    const addEnumButton = screen.getByRole('button', { name: textMock('schema_editor.add_enum') });
    await act(() => user.click(addEnumButton));

    const newEnumInput = screen.getByLabelText(textMock('schema_editor.enum_value', { index: 3 }));

    await act(() => user.type(newEnumInput, 'a'));
    await act(() => user.tab());

    const errorMessage = screen.getByText(textMock('schema_editor.enum_error_duplicate'));
    expect(errorMessage).toBeInTheDocument();
  });
});

const renderItemRestrictions = (props?: Partial<EnumListProps>) =>
  renderWithProviders({
    appContextProps: {
      schemaModel: SchemaModel.fromArray(uiSchemaNodesMock),
      save: mockSaveDataModel,
    },
  })(<EnumList {...defaultProps} {...props} />);

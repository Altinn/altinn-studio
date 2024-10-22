import React from 'react';
import { screen } from '@testing-library/react';
import { ColumnElement, type ColumnElementProps } from './ColumnElement';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { type TableColumn } from '../types/TableColumn';

const headerContentMock: string = 'Header';
const cellContentQueryMock: string = 'Query';
const cellContentDefaultMock: string = 'Default';
const columnNumberMock: number = 1;

const mockTableColumn: TableColumn = {
  headerContent: headerContentMock,
  cellContent: {
    query: cellContentQueryMock,
    default: cellContentDefaultMock,
  },
};

const defaultProps: ColumnElementProps = {
  tableColumn: mockTableColumn,
  columnNumber: columnNumberMock,
  onDeleteColumn: jest.fn(),
  onEdit: jest.fn(),
};

describe('ColumnElement', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call onEdit with updated header content when header text field is blurred', async () => {
    const onEditMock = jest.fn();

    const user = userEvent.setup();
    renderColumnElement({
      onEdit: onEditMock,
    });

    const headerInputbutton = screen.getByRole('button', {
      name: `${textMock('ux_editor.properties_panel.subform_table_columns.header_content_label')}: ${headerContentMock}`,
    });
    await user.click(headerInputbutton);

    const headerInputfield = screen.getByLabelText(
      textMock('ux_editor.properties_panel.subform_table_columns.header_content_label'),
    );
    const newValue: string = 'a';
    await user.type(headerInputfield, newValue);
    await user.tab();

    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onEditMock).toHaveBeenCalledWith({
      ...mockTableColumn,
      headerContent: `${headerContentMock}${newValue}`,
    });
  });

  it('should call onEdit with updated query content when query text field is blurred', async () => {
    const onEditMock = jest.fn();

    const user = userEvent.setup();
    renderColumnElement({
      onEdit: onEditMock,
    });

    const queryInputbutton = screen.getByRole('button', {
      name: `${textMock('ux_editor.properties_panel.subform_table_columns.cell_content_query_label')}: ${cellContentQueryMock}`,
    });
    await user.click(queryInputbutton);

    const queryInputfield = screen.getByLabelText(
      textMock('ux_editor.properties_panel.subform_table_columns.cell_content_query_label'),
    );
    const newValue: string = 'a';
    await user.type(queryInputfield, newValue);
    await user.tab();

    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onEditMock).toHaveBeenCalledWith({
      ...mockTableColumn,
      cellContent: { ...mockTableColumn.cellContent, query: `${cellContentQueryMock}${newValue}` },
    });
  });

  it('should call onEdit with updated default content when default text field is blurred', async () => {
    const onEditMock = jest.fn();

    const user = userEvent.setup();
    renderColumnElement({
      onEdit: onEditMock,
    });

    const defaultInputbutton = screen.getByRole('button', {
      name: `${textMock('ux_editor.properties_panel.subform_table_columns.cell_content_default_label')}: ${cellContentDefaultMock}`,
    });
    await user.click(defaultInputbutton);

    const defaultInputfield = screen.getByLabelText(
      textMock('ux_editor.properties_panel.subform_table_columns.cell_content_default_label'),
    );
    const newValue: string = 'a';
    await user.type(defaultInputfield, newValue);
    await user.tab();

    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onEditMock).toHaveBeenCalledWith({
      ...mockTableColumn,
      cellContent: {
        ...mockTableColumn.cellContent,
        default: `${cellContentDefaultMock}${newValue}`,
      },
    });
  });

  it('should call onDeleteColumn when delete button is clicked', async () => {
    const onDeleteColumnMock = jest.fn();

    const user = userEvent.setup();
    renderColumnElement({
      onDeleteColumn: onDeleteColumnMock,
    });

    const deleteButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.delete_column', {
        columnNumber: columnNumberMock,
      }),
    });
    await user.click(deleteButton);

    expect(onDeleteColumnMock).toHaveBeenCalledTimes(1);
  });
});

const renderColumnElement = (props: Partial<ColumnElementProps> = {}) => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(<ColumnElement {...defaultProps} {...props} />, {
    ...queriesMock,
    queryClient,
  });
};

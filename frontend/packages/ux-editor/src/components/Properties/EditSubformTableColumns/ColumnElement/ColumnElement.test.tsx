import React from 'react';
import { screen } from '@testing-library/react';
import { ColumnElement, type ColumnElementProps } from './ColumnElement';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { type TableColumn } from '../types/TableColumn';
import { layoutSet3SubformNameMock } from '../../../../testing/layoutSetsMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { subformLayoutMock } from '../../../../testing/subformLayoutMock';

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
  isInitialOpenForEdit: false,
  onDeleteColumn: jest.fn(),
  onEdit: jest.fn(),
  subformLayout: layoutSet3SubformNameMock,
};

describe('ColumnElement', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call onEdit with updated header content when click on save button', async () => {
    const onEditMock = jest.fn();

    const user = userEvent.setup();
    renderColumnElement({
      onEdit: onEditMock,
    });

    const editButton = screen.getByRole('button', {
      name: /ux_editor.properties_panel.subform_table_columns.column_header/,
    });
    await user.click(editButton);

    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    await user.click(componentSelect);
    await user.click(
      screen.getByRole('option', { name: new RegExp(`${subformLayoutMock.component3Id}`) }),
    );

    await screen.findByText(
      textMock(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
      ),
    );

    await user.click(
      await screen.findByText(
        textMock('ux_editor.properties_panel.subform_table_columns.column_title_unedit'),
      ),
    );
    await user.type(
      screen.getByText(
        textMock('ux_editor.properties_panel.subform_table_columns.column_title_edit'),
      ),
      'New Title',
    );

    const saveButton = await screen.findByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);

    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onEditMock).toHaveBeenCalledWith({
      ...mockTableColumn,
      headerContent: expect.stringContaining('subform_table_column_title_'),
      cellContent: { query: subformLayoutMock.component3.dataModelBindings.simpleBinding },
    });
  });

  it('should render combobox with description', async () => {
    const user = userEvent.setup();
    renderColumnElement();

    const editButton = screen.getByRole('button', {
      name: /ux_editor.properties_panel.subform_table_columns.column_header/,
    });
    await user.click(editButton);

    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    expect(componentSelect).toBeInTheDocument();
  });

  it('should call onDeleteColumn when delete button is clicked', async () => {
    const onDeleteColumnMock = jest.fn();

    const user = userEvent.setup();
    renderColumnElement({
      onDeleteColumn: onDeleteColumnMock,
    });

    const editButton = screen.getByRole('button', {
      name: /ux_editor.properties_panel.subform_table_columns.column_header/,
    });
    await user.click(editButton);
    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(deleteButton);

    expect(onDeleteColumnMock).toHaveBeenCalledTimes(1);
  });
});

const renderColumnElement = (props: Partial<ColumnElementProps> = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.FormLayouts, org, app, layoutSet3SubformNameMock],
    subformLayoutMock.layoutSet,
  );
  return renderWithProviders(<ColumnElement {...defaultProps} {...props} />, {
    ...queriesMock,
    queryClient,
  });
};

import React, { act } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { ColumnElement, type ColumnElementProps } from './ColumnElement';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { type TableColumn } from '../types/TableColumn';
import { layoutSet3SubFormNameMock, layoutSetsMock } from '../../../../testing/layoutSetsMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import {
  component1IdMock,
  component1Mock,
  component1TypeMock,
  externalLayoutsMock,
  layout1Mock,
  layoutMock,
} from '../../../../testing/layoutMock';

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
  layoutSetName: layoutSet3SubFormNameMock,
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

    const editButton = screen.getByRole('button', {
      name: /ux_editor.properties_panel.subform_table_columns.column_header/,
    });
    await user.click(editButton);

    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    await user.click(componentSelect);
    await act(async () => {
      await user.click(
        screen.getByRole('option', { name: `${component1IdMock} ${component1TypeMock}` }),
      );
    });

    await waitFor(async () => {
      await user.click(
        screen.getByRole('button', {
          name: textMock('general.save'),
        }),
      );
    });

    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onEditMock).toHaveBeenCalledWith({
      ...mockTableColumn,
      headerContent: component1Mock.textResourceBindings.title,
      cellContent: { query: component1Mock.dataModelBindings.simpleBinding },
    });
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
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSet3SubFormNameMock], {
    side1: layoutMock,
  });
  return renderWithProviders(<ColumnElement {...defaultProps} {...props} />, {
    ...queriesMock,
    queryClient,
  });
};

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
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
import {
  EditColumnElementComponentSelect,
  type EditColumnElementComponentSelectProps,
} from '../ColumnElement/EditColumnElement/EditColumnElement';

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
  layoutSetName: layoutSet3SubformNameMock,
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
    await user.click(
      screen.getByRole('option', { name: new RegExp(`${subformLayoutMock.component1Id}`) }),
    );

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
      headerContent: subformLayoutMock.component1.textResourceBindings.title,
      cellContent: { query: subformLayoutMock.component1.dataModelBindings.simpleBinding },
    });
  });

  it('should render comobox with description', async () => {
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

describe('EditColumnElementComponentSelect', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render combobox with no components message when no components are available', async () => {
    const user = userEvent.setup();
    renderEditColumnElementComponentSelect({
      components: [],
    });

    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);
    expect(
      screen.getByRole('option', {
        name: textMock('ux_editor.properties_panel.subform_table_columns.empty_columns_message'),
      }),
    ).toBeInTheDocument();
  });

  it('should not render no components message when components are available', async () => {
    const user = userEvent.setup();
    renderEditColumnElementComponentSelect();
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);
    expect(
      screen.queryByRole('option', {
        name: textMock('ux_editor.properties_panel.subform_table_columns.empty_columns_message'),
      }),
    ).not.toBeInTheDocument();
  });

  it('should render just components with labels', async () => {
    const user = userEvent.setup();
    renderEditColumnElementComponentSelect();
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);
    expect(
      screen.getByRole('option', {
        name: new RegExp(`${subformLayoutMock.component1Id}`),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: new RegExp(`${subformLayoutMock.component2Id}`),
      }),
    ).toBeInTheDocument();
  });
});

const renderEditColumnElementComponentSelect = (
  props: Partial<EditColumnElementComponentSelectProps> = {},
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.FormLayouts, org, app, layoutSet3SubformNameMock],
    subformLayoutMock.layoutSet,
  );
  return renderWithProviders(
    <EditColumnElementComponentSelect
      components={[
        {
          id: subformLayoutMock.component1Id,
          type: subformLayoutMock.component1.type,
          itemType: subformLayoutMock.component1.itemType,
          dataModelBindings: subformLayoutMock.component1.dataModelBindings,
        },
        {
          id: subformLayoutMock.component2Id,
          type: subformLayoutMock.component2.type,
          itemType: subformLayoutMock.component2.itemType,
        },
      ]}
      onSelectComponent={jest.fn()}
      {...defaultProps}
      {...props}
    />,
    {
      ...queriesMock,
      queryClient,
    },
  );
};

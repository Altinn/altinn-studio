import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import {
  EditSubFormTableColumns,
  type EditSubFormTableColumnsProps,
} from './EditSubFormTableColumns';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { subformLayoutMock } from '../../../testing/subformLayoutMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { textLanguagesMock } from '../../../testing/mocks';

const subFormComponentMock = componentMocks[ComponentType.SubForm];

const defaultProps: EditSubFormTableColumnsProps = {
  component: {
    ...subFormComponentMock,
    layoutSet: subformLayoutMock.layoutSetName,
  },
  handleComponentChange: jest.fn(),
};

describe('EditSubFormTableColumns', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call handleComponentChange when a new column is added when tableColumns initially are empty ', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();

    renderEditSubFormTableColumns({
      component: { ...subFormComponentMock, tableColumns: undefined },
      handleComponentChange: handleComponentChangeMock,
    });

    const addColumnButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.add_column'),
    });

    await user.click(addColumnButton);

    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    const updatedComponent = handleComponentChangeMock.mock.calls[0][0];
    expect(updatedComponent.tableColumns.length).toBe(1);
  });

  it('should call handleComponentChange when a new column is added when tableColumns has a value', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();

    renderEditSubFormTableColumns({
      handleComponentChange: handleComponentChangeMock,
    });

    const addColumnButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.add_column'),
    });

    await user.click(addColumnButton);

    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    const updatedComponent = handleComponentChangeMock.mock.calls[0][0];
    expect(updatedComponent.tableColumns.length).toBe(2);
  });

  it('should call handleComponentChange when a column is edited', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();

    renderEditSubFormTableColumns({
      handleComponentChange: handleComponentChangeMock,
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

    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    const updatedComponent = handleComponentChangeMock.mock.calls[0][0];
    expect(updatedComponent.tableColumns[0].headerContent).toBe(
      subformLayoutMock.component1.textResourceBindings.title,
    );
  });

  it('should call handleComponentChange when a column is deleted', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();

    renderEditSubFormTableColumns({
      handleComponentChange: handleComponentChangeMock,
    });

    const editButton = screen.getByRole('button', {
      name: /ux_editor.properties_panel.subform_table_columns.column_header/,
    });
    await user.click(editButton);

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(deleteButton);

    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    const updatedComponent = handleComponentChangeMock.mock.calls[0][0];
    expect(updatedComponent.tableColumns.length).toBe(0);
  });

  it('should render the text resource value for the column header', async () => {
    renderEditSubFormTableColumns({
      component: {
        ...subFormComponentMock,
        tableColumns: [
          {
            headerContent: textKeyId,
            components: [subformLayoutMock.component1Id],
          },
        ],
      },
    });

    expect(screen.getByText(textKeyValue)).toBeInTheDocument();
  });
});

const textKeyId = subformLayoutMock.component1.textResourceBindings.title;
const textKeyValue = 'testtext';
const textResourcesMock = { ['nb']: [{ id: textKeyId, value: textKeyValue }] };

const renderEditSubFormTableColumns = (props: Partial<EditSubFormTableColumnsProps> = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResourcesMock);
  queryClient.setQueryData(
    [QueryKey.FormLayouts, org, app, subformLayoutMock.layoutSetName],
    subformLayoutMock.layoutSet,
  );
  return renderWithProviders(<EditSubFormTableColumns {...defaultProps} {...props} />, {
    ...queriesMock,
    queryClient,
  });
};

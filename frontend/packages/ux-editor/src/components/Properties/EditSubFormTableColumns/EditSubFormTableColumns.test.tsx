import React from 'react';
import { screen } from '@testing-library/react';
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

const subFormComponentMock = componentMocks[ComponentType.SubForm];

const defaultProps: EditSubFormTableColumnsProps = {
  component: subFormComponentMock,
  handleComponentChange: jest.fn(),
};

describe('EditSubFormTableColumns', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call handleComponentChange when a new column is added', async () => {
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

    const headerInputbutton = screen.getByRole('button', {
      name: `${textMock('ux_editor.properties_panel.subform_table_columns.header_content_label')}: ${subFormComponentMock.tableColumns[0].headerContent}`,
    });

    await user.click(headerInputbutton);

    const headerInputfield = screen.getByLabelText(
      textMock('ux_editor.properties_panel.subform_table_columns.header_content_label'),
    );

    const newValue = 'Updated Header';
    await user.clear(headerInputfield);
    await user.type(headerInputfield, newValue);
    await user.tab();

    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    const updatedComponent = handleComponentChangeMock.mock.calls[0][0];
    expect(updatedComponent.tableColumns[0].headerContent).toBe(newValue);
  });

  it('should call handleComponentChange when a column is deleted', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();

    renderEditSubFormTableColumns({
      handleComponentChange: handleComponentChangeMock,
    });

    const deleteButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.delete_column', {
        columnNumber: 1,
      }),
    });

    await user.click(deleteButton);

    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    const updatedComponent = handleComponentChangeMock.mock.calls[0][0];
    expect(updatedComponent.tableColumns.length).toBe(0);
  });
});

const renderEditSubFormTableColumns = (props: Partial<EditSubFormTableColumnsProps> = {}) => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(<EditSubFormTableColumns {...defaultProps} {...props} />, {
    ...queriesMock,
    queryClient,
  });
};

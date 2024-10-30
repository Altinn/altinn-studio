import React from 'react';
import { screen } from '@testing-library/react';
import {
  EditSubformTableColumns,
  type EditSubformTableColumnsProps,
} from './EditSubformTableColumns';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';

const subformComponentMock = componentMocks[ComponentType.Subform];

const mockSubFormLayoutValidation = jest.fn();
jest.mock('./hooks/useSubFormLayoutValidation', () => ({
  useSubFormLayoutValidation: () => mockSubFormLayoutValidation(),
}));

const defaultProps: EditSubformTableColumnsProps = {
  component: subformComponentMock,
  handleComponentChange: jest.fn(),
};

describe('EditSubformTableColumns', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call handleComponentChange when a new column is added when tableColumns initially are empty ', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();

    renderEditSubformTableColumns({
      props: {
        component: { ...subformComponentMock, tableColumns: undefined },
        handleComponentChange: handleComponentChangeMock,
      },
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

    renderEditSubformTableColumns({
      props: { handleComponentChange: handleComponentChangeMock },
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

    renderEditSubformTableColumns({
      props: { handleComponentChange: handleComponentChangeMock },
    });

    const headerInputbutton = screen.getByRole('button', {
      name: `${textMock('ux_editor.properties_panel.subform_table_columns.header_content_label')}: ${subformComponentMock.tableColumns[0].headerContent}`,
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

    renderEditSubformTableColumns({
      props: { handleComponentChange: handleComponentChangeMock },
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

  it('should show warning if subform validation is false', () => {
    renderEditSubformTableColumns({ isSubFormLayoutConfigured: false });
    expect(
      screen.getByText(
        textMock('ux_editor.component_properties.subform.layout_set_is_missing_content_heading'),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('ux_editor.component_properties.subform.layout_set_is_missing_content_paragraph'),
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('top_menu.create') })).toBeInTheDocument();
  });
});

type renderEditSubformTableColumnsParameters = {
  props?: Partial<EditSubformTableColumnsProps>;
  isSubFormLayoutConfigured?: boolean;
};

const renderEditSubformTableColumns = (
  { props, isSubFormLayoutConfigured }: renderEditSubformTableColumnsParameters = {
    isSubFormLayoutConfigured: true,
  },
) => {
  mockSubFormLayoutValidation.mockReturnValue(isSubFormLayoutConfigured);
  const queryClient = createQueryClientMock();
  return renderWithProviders(<EditSubformTableColumns {...defaultProps} {...props} />, {
    ...queriesMock,
    queryClient,
  });
};

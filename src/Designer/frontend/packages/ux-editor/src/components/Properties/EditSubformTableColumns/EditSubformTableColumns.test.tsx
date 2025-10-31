import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { subformLayoutMock } from '../../../testing/subformLayoutMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import {
  EditSubformTableColumns,
  type EditSubformTableColumnsProps,
} from './EditSubformTableColumns';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../../testing/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const subformComponentMock = componentMocks[ComponentType.Subform];

const mockSubformLayoutValidation = jest.fn();
jest.mock('./hooks/useSubformLayoutValidation', () => ({
  useSubformLayoutValidation: () => mockSubformLayoutValidation(),
}));

const defaultProps: EditSubformTableColumnsProps = {
  component: {
    ...subformComponentMock,
    layoutSet: subformLayoutMock.layoutSetName,
  },
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

    await user.click(getAddColumnButton());
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);

    const numberOfColumnsAfterAdded = getUpdatedTableColumns(handleComponentChangeMock).length;
    expect(numberOfColumnsAfterAdded).toBe(1);
  });

  it('should call handleComponentChange when a new column is added when tableColumns has a value', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();

    renderEditSubformTableColumns({
      props: { handleComponentChange: handleComponentChangeMock },
    });

    await user.click(getAddColumnButton());
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);

    const numberOfColumnsAfterAdded = getUpdatedTableColumns(handleComponentChangeMock).length;
    expect(numberOfColumnsAfterAdded).toBe(2);
  });

  it('should call handleComponentChange when a column is edited', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();

    renderEditSubformTableColumns({
      props: { handleComponentChange: handleComponentChangeMock },
    });

    const editButton = screen.getByRole('button', {
      name: /ux_editor.properties_panel.subform_table_columns.column_header/,
    });
    await user.click(editButton);

    await user.click(getComponentSelector());
    await user.click(
      screen.getByRole('option', { name: new RegExp(`${subformLayoutMock.component1Id}`) }),
    );

    const saveButton = await screen.findByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);

    const columnTitleKey = getUpdatedTableColumns(handleComponentChangeMock)[0].headerContent;
    expect(columnTitleKey).toEqual(
      expect.stringContaining(subformLayoutMock.component1.textResourceBindings.title),
    );
  });

  it('should call handleComponentChange when a column is deleted', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();

    renderEditSubformTableColumns({
      props: { handleComponentChange: handleComponentChangeMock },
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
    const numberOfColumnsAfterDeletion = getUpdatedTableColumns(handleComponentChangeMock);
    expect(numberOfColumnsAfterDeletion.length).toBe(0);
  });

  it('should show warning if subform validation is false', () => {
    renderEditSubformTableColumns({ isSubformLayoutConfigured: false });
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
    expect(
      screen.getByRole('button', {
        name: textMock('ux_editor.component_properties.navigate_to_subform_button'),
      }),
    ).toBeInTheDocument();
  });

  it('should render new column in edit mode when add column button is clicked', async () => {
    const user = userEvent.setup();
    const handleComponentChangeMock = jest.fn();
    const { rerender } = renderEditSubformTableColumns({
      props: { handleComponentChange: handleComponentChangeMock },
    });

    await user.click(getAddColumnButton());
    const updatedProps = {
      handleComponentChange: handleComponentChangeMock,
      component: {
        ...subformComponentMock,
        tableColumns: [...getUpdatedTableColumns(handleComponentChangeMock)],
      },
    };
    rerender(<EditSubformTableColumns {...updatedProps} />);
    expect(getComponentSelector()).toBeInTheDocument();
  });
});

const componentTextKeyId = subformLayoutMock.component1.textResourceBindings.title;
const componentTextKeyValue = 'testtext';
const textResourcesMock = { ['nb']: [{ id: componentTextKeyId, value: componentTextKeyValue }] };
type renderEditSubformTableColumnsParameters = {
  props?: Partial<EditSubformTableColumnsProps>;
  isSubformLayoutConfigured?: boolean;
};

const getAddColumnButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.properties_panel.subform_table_columns.add_column'),
  });
const getComponentSelector = () =>
  screen.getByLabelText(
    textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
  );

const getUpdatedTableColumns = (mockFn: jest.Mock) => mockFn.mock.calls[0][0].tableColumns;

const renderEditSubformTableColumns = (
  { props, isSubformLayoutConfigured }: renderEditSubformTableColumnsParameters = {
    isSubformLayoutConfigured: true,
  },
) => {
  mockSubformLayoutValidation.mockReturnValue(isSubformLayoutConfigured);
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResourcesMock);
  queryClient.setQueryData(
    [QueryKey.FormLayouts, org, app, subformLayoutMock.layoutSetName],
    subformLayoutMock.layoutSet,
  );
  return renderWithProviders(<EditSubformTableColumns {...defaultProps} {...props} />, {
    ...queriesMock,
    queryClient,
  });
};

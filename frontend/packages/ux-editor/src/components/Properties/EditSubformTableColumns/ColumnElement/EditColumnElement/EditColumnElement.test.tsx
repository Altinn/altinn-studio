import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { subformLayoutMock } from '../../../../../testing/subformLayoutMock';
import { EditColumnElement, type EditColumnElementProps } from './EditColumnElement';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { renderWithProviders } from '../../../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

const subformComponentMock = componentMocks[ComponentType.Subform];

const defaultProps: EditColumnElementProps = {
  sourceColumn: subformComponentMock.tableColumns[0],
  columnNumber: 1,
  onDeleteColumn: jest.fn(),
  onEdit: jest.fn(),
  subformLayout: subformLayoutMock.layoutSetName,
};

describe('EditColumnElementComponentSelect', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render combobox with no components message when no components are available', async () => {
    const user = userEvent.setup();
    renderEditColumnElement({}, null);

    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);
    expect(
      screen.getByText(
        textMock(
          'ux_editor.properties_panel.subform_table_columns.no_components_available_message',
        ),
      ),
    ).toBeInTheDocument();
  });

  it('should not render availability components message when components are available', async () => {
    const user = userEvent.setup();
    renderEditColumnElement();
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);
    expect(
      screen.queryByText(
        textMock(
          'ux_editor.properties_panel.subform_table_columns.no_components_available_message',
        ),
      ),
    ).not.toBeInTheDocument();
  });

  it('should render just components with labels and data model bindings', async () => {
    const user = userEvent.setup();
    renderEditColumnElement();
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
      screen.queryByRole('option', {
        name: new RegExp(`${subformLayoutMock.component2Id}`),
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: new RegExp(`${subformLayoutMock.component3Id}`),
      }),
    ).toBeInTheDocument();
  });

  it('should not render multiple data model bindings label when there are not multiple data model bindings', async () => {
    const user = userEvent.setup();
    renderEditColumnElement();
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });
    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);
    const componentWithSingleBinding = screen.getByRole('option', {
      name: new RegExp(`${subformLayoutMock.component1Id}`),
    });
    await user.click(componentWithSingleBinding);
    expect(
      screen.queryByText(
        textMock(
          'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
        ),
      ),
    ).not.toBeInTheDocument();
  });

  it('should render multiple data model bindings label when there are multiple data model bindings', async () => {
    const user = userEvent.setup();
    renderEditColumnElement();
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });
    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);
    const componentWitMultipleBindings = screen.getByRole('option', {
      name: new RegExp(`${subformLayoutMock.component3Id}`),
    });
    await user.click(componentWitMultipleBindings);
    expect(
      await screen.findByText(
        textMock(
          'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
        ),
      ),
    ).toBeInTheDocument();
  });

  it('should only render data model bindings that have a value', async () => {
    const user = userEvent.setup();
    renderEditColumnElement();
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });
    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);

    const componentWitMultipleBindings = screen.getByRole('option', {
      name: new RegExp(`${subformLayoutMock.component4Id}`),
    });
    await user.click(componentWitMultipleBindings);

    const dataModelBindingsSelect = await screen.findByText(
      textMock(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
      ),
    );

    await user.click(dataModelBindingsSelect);

    expect(
      screen.getByRole('option', {
        name: `${textMock('ux_editor.modal_properties_data_model_label.address')} ${subformLayoutMock.component4.dataModelBindings.address}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: `${textMock('ux_editor.modal_properties_data_model_label.postPlace')} ${subformLayoutMock.component4.dataModelBindings.postPlace}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', {
        name: `${textMock('ux_editor.modal_properties_data_model_label.zipCode')} ${subformLayoutMock.component4.dataModelBindings.zipCode}`,
      }),
    ).not.toBeInTheDocument();
  });

  it('should call onEdit with updated query when selecting a simple data model binding and clicking on save button', async () => {
    const user = userEvent.setup();

    const onEditMock = jest.fn();
    renderEditColumnElement({
      onEdit: onEditMock,
    });

    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    await user.click(componentSelect);
    await user.click(
      screen.getByRole('option', { name: new RegExp(`${subformLayoutMock.component1Id}`) }),
    );

    const saveButton = await screen.findByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);

    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onEditMock).toHaveBeenCalledWith({
      headerContent: expect.stringContaining('subform_table_column_title_'),
      cellContent: { query: subformLayoutMock.component1.dataModelBindings.simpleBinding },
    });
  });

  it('should call onEdit with updated query when selecting a multiple data model binding and clicking on save button', async () => {
    const user = userEvent.setup();

    const onEditMock = jest.fn();
    renderEditColumnElement({
      onEdit: onEditMock,
    });

    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    await user.click(componentSelect);
    await user.click(
      screen.getByRole('option', { name: new RegExp(`${subformLayoutMock.component3Id}`) }),
    );

    const dataModelBindingsSelect = await screen.findByText(
      textMock(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
      ),
    );

    await user.click(dataModelBindingsSelect);
    await user.click(
      screen.getByRole('option', {
        name: new RegExp(subformLayoutMock.component3.dataModelBindings.simpleBinding.toString()),
      }),
    );

    const saveButton = await screen.findByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);

    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onEditMock).toHaveBeenCalledWith({
      headerContent: expect.stringContaining('subform_table_column_title_'),
      cellContent: { query: subformLayoutMock.component3.dataModelBindings.simpleBinding },
    });
  });
});

const renderEditColumnElement = (
  props: Partial<EditColumnElementProps> = {},
  layoutSet = subformLayoutMock.layoutSet,
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.FormLayouts, org, app, subformLayoutMock.layoutSetName],
    layoutSet,
  );
  queryClient.setQueryData([QueryKey.TextResources, org, app], {
    ['nb']: [{ id: 'some-title', value: 'some-title' }],
  });
  return renderWithProviders(<EditColumnElement {...defaultProps} {...props} />, {
    queryClient,
  });
};

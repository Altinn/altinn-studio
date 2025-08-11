import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
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
import { convertDataBindingToInternalFormat } from '@altinn/ux-editor/utils/dataModelUtils';

const subformComponentMock = componentMocks[ComponentType.Subform];

const defaultProps: EditColumnElementProps = {
  tableColumn: subformComponentMock.tableColumns[0],
  columnNumber: 1,
  onDeleteColumn: jest.fn(),
  onChange: jest.fn(),
  onClose: jest.fn(),
  subformLayout: subformLayoutMock.layoutSetName,
};
const textKeyMock = 'textkeymock1';
const textValueMock = 'textkeymock1';
const { field: addressDataField } = convertDataBindingToInternalFormat(
  subformLayoutMock.component4.dataModelBindings['address'],
);
const { field: postPlaceDataField } = convertDataBindingToInternalFormat(
  subformLayoutMock.component4.dataModelBindings['postPlace'],
);

describe('EditColumnElementComponentSelect', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  let confirmSpy: jest.SpyInstance;
  beforeAll(() => {
    confirmSpy = jest.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(jest.fn(() => true));
  });

  afterAll(() => {
    confirmSpy.mockRestore();
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
    renderEditColumnElement({
      tableColumn: {
        headerContent: subformLayoutMock.component4.textResourceBindings.title,
        cellContent: { query: addressDataField },
      },
    });
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });
    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);
    const componentWithMultipleBindings = screen.getByRole('option', {
      name: new RegExp(`${subformLayoutMock.component4Id}`),
    });
    await user.click(componentWithMultipleBindings);
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
    renderEditColumnElement({
      tableColumn: {
        headerContent: subformLayoutMock.component4.textResourceBindings.title,
        cellContent: { query: addressDataField },
      },
    });
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

  it('should call onChange with updated header content on changing text key', async () => {
    const onChangeMock = jest.fn();

    const user = userEvent.setup();
    renderEditColumnElement({
      onChange: onChangeMock,
    });

    await user.click(
      screen.getByRole('button', {
        name: textMock('ux_editor.properties_panel.subform_table_columns.column_title_edit'),
      }),
    );
    await user.click(
      screen.getByRole('tab', {
        name: textMock('ux_editor.text_resource_binding_search'),
      }),
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('ux_editor.search_text_resources_label') }),
      textKeyMock,
    );
    await user.click(
      screen.getAllByRole('button', {
        name: textMock('general.save'),
      })[0],
    );
    expect(onChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headerContent: textKeyMock,
      }),
    );
  });

  it('should call onChange with updated query when selecting a simple data model binding and clicking on save button', async () => {
    const user = userEvent.setup();

    const onChangeMock = jest.fn();
    renderEditColumnElement({
      onChange: onChangeMock,
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

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith({
      headerContent: subformLayoutMock.component1.textResourceBindings.title,
      cellContent: { query: subformLayoutMock.component1.dataModelBindings.simpleBinding },
    });
  });

  it('should call onChange when clicking delete button in TextResource', async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();
    renderEditColumnElement({
      onChange: onChangeMock,
      tableColumn: {
        headerContent: subformLayoutMock.component4.textResourceBindings.title,
        cellContent: { query: addressDataField },
      },
    });

    await user.click(
      screen.getByRole('button', {
        name: textMock('ux_editor.properties_panel.subform_table_columns.column_title_edit'),
      }),
    );
    await user.click(
      screen.getByRole('tab', {
        name: textMock('ux_editor.text_resource_binding_search'),
      }),
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('ux_editor.search_text_resources_label') }),
      textKeyMock,
    );
    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headerContent: textKeyMock,
      }),
    );
    await act(async () => {
      await user.click(
        screen.getAllByRole('button', {
          name: textMock('general.delete'),
        })[0],
      );
    });
    expect(onChangeMock).toHaveBeenCalledTimes(1);
  });

  it('should call onChange with updated query when selecting a multiple data model binding and clicking on save button', async () => {
    const user = userEvent.setup();

    const onChangeMock = jest.fn();
    renderEditColumnElement({
      onChange: onChangeMock,
      tableColumn: {
        headerContent: subformLayoutMock.component4.textResourceBindings.title,
        cellContent: { query: addressDataField },
      },
    });
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    await user.click(componentSelect);
    await user.click(
      screen.getByRole('option', { name: new RegExp(`${subformLayoutMock.component4Id}`) }),
    );

    const dataModelBindingsSelect = await screen.findByRole('combobox', {
      name: textMock(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
      ),
    });

    await user.click(dataModelBindingsSelect);
    await user.click(
      await screen.findByRole('option', {
        name: new RegExp(postPlaceDataField),
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('option', { name: new RegExp(postPlaceDataField) }),
      ).not.toBeInTheDocument(),
    );
    const textResourceButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.column_title_edit'),
    });
    await user.click(textResourceButton);
    const textResourceTextarea = screen.getByRole('textbox', {
      name: textMock('ux_editor.text_resource_binding_text'),
    });
    await user.type(textResourceTextarea, 'Test Column Title');
    const textResourceSaveButtons = screen.getAllByRole('button', {
      name: textMock('general.save'),
    });
    const textResourceSaveButton = textResourceSaveButtons[0];
    await user.click(textResourceSaveButton);
    const saveButton = await screen.findByRole('button', { name: textMock('general.save') });

    await act(async () => {
      await user.click(saveButton);
    });
    expect(onChangeMock).toHaveBeenCalledTimes(2);
    expect(onChangeMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        headerContent: subformLayoutMock.component4.textResourceBindings.title,
        cellContent: { query: 'Address' },
      }),
    );
    expect(onChangeMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        headerContent: subformLayoutMock.component4.textResourceBindings.title,
        cellContent: { query: 'PostPlace' },
      }),
    );
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
    nb: [{ id: textKeyMock, value: textValueMock }],
  });
  return renderWithProviders(<EditColumnElement {...defaultProps} {...props} />, {
    queryClient,
  });
};

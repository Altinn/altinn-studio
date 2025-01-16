import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { subformLayoutMock } from '../../../../../testing/subformLayoutMock';
import {
  EditColumnElementComponentSelect,
  type EditColumnElementComponentSelectProps,
} from './EditColumnElement';

const defaultComponents = [
  {
    id: subformLayoutMock.component1Id,
    type: subformLayoutMock.component1.type,
    itemType: subformLayoutMock.component1.itemType,
    dataModelBindings: subformLayoutMock.component1.dataModelBindings,
    textResourceBindings: subformLayoutMock.component1.textResourceBindings,
  },
  {
    id: subformLayoutMock.component2Id,
    type: subformLayoutMock.component2.type,
    itemType: subformLayoutMock.component2.itemType,
    dataModelBindings: {
      binding1: 'path1',
      binding2: 'path2',
    },
    textResourceBindings: { title: 'component2-title' },
  },
  {
    id: subformLayoutMock.component2Id,
    type: subformLayoutMock.component2.type,
    itemType: subformLayoutMock.component2.itemType,
    dataModelBindings: { simpleBinding: '' },
    textResourceBindings: { title: 'no-bindings-title' },
  },
];

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
      screen.getByText(
        textMock(
          'ux_editor.properties_panel.subform_table_columns.no_components_available_message',
        ),
      ),
    ).toBeInTheDocument();
  });

  it('should not render availability components message when components are available', async () => {
    const user = userEvent.setup();
    renderEditColumnElementComponentSelect();
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);
    expect(
      screen.queryByRole('option', {
        name: textMock(
          'ux_editor.properties_panel.subform_table_columns.no_components_available_message',
        ),
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

  it('should clear bindings when the selected component has no dataModelBindings', async () => {
    const user = userEvent.setup();

    const onSelectComponent = jest.fn();
    renderEditColumnElementComponentSelect({
      onSelectComponent,
    });

    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    await user.click(componentSelect);
    const componentWithoutBindings = screen.getByText(subformLayoutMock.component1Id);
    await waitFor(() => user.click(componentWithoutBindings));
    onSelectComponent([subformLayoutMock.component1Id]);

    expect(onSelectComponent).toHaveBeenCalledTimes(1);
    expect(onSelectComponent).toHaveBeenCalledWith([subformLayoutMock.component1Id]);
  });

  it('should not clear bindings when the selected component has dataModelBindings', async () => {
    const user = userEvent.setup();

    const onSelectComponent = jest.fn();
    renderEditColumnElementComponentSelect({
      onSelectComponent,
    });

    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    await user.click(componentSelect);
    const componentWithoutBindings = screen.getByText(subformLayoutMock.component2Id);
    await waitFor(() => user.click(componentWithoutBindings));
    onSelectComponent([subformLayoutMock.component2Id]);

    expect(onSelectComponent).toHaveBeenCalledTimes(1);
    expect(onSelectComponent).toHaveBeenCalledWith([subformLayoutMock.component2Id]);
  });

  it('should render multiple data model bindings label when there are multiple data model bindings', async () => {
    const user = userEvent.setup();
    renderEditColumnElementComponentSelect({
      selectedComponentBindings: [
        {
          binding1: 'path1',
          binding2: 'path2',
        },
        {
          binding3: 'path3',
          binding4: 'path4',
        },
      ],
    });
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });
    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);
    expect(
      screen.getByText(
        textMock(
          'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
        ),
      ),
    ).toBeInTheDocument();
  });

  it('should not render multiple data model bindings label when there are not multiple data model bindings', async () => {
    const user = userEvent.setup();
    renderEditColumnElementComponentSelect({
      selectedComponentBindings: [
        {
          binding1: 'path1',
          binding2: 'path2',
        },
      ],
    });
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });
    expect(componentSelect).toBeInTheDocument();
    await user.click(componentSelect);
    expect(
      screen.queryByText(
        textMock(
          'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
        ),
      ),
    ).not.toBeInTheDocument();
  });

  it('should return early if selectedComponent has no dataModelBindings', async () => {
    const user = userEvent.setup();
    const onSelectComponent = jest.fn();
    renderEditColumnElementComponentSelect({
      onSelectComponent,
      components: [
        {
          id: 'component-without-bindings',
          type: subformLayoutMock.component1.type,
          itemType: 'COMPONENT',
          dataModelBindings: undefined,
          textResourceBindings: {},
        },
      ],
    });
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });

    await user.click(componentSelect);
    const componentWithoutBindings = screen.getByText('component-without-bindings');
    await user.click(componentWithoutBindings);

    await waitFor(() => {
      expect(onSelectComponent).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(onSelectComponent).toHaveBeenCalledWith(['component-without-bindings']);
    });
  });

  it('should return early if selectedComponent is undefined', async () => {
    const user = userEvent.setup();
    const onSelectComponent = jest.fn();
    renderEditColumnElementComponentSelect({
      onSelectComponent,
      components: [],
    });
    const componentSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });
    await user.click(componentSelect);
    onSelectComponent([undefined]);
    expect(onSelectComponent).toHaveBeenCalledTimes(1);
    expect(onSelectComponent).toHaveBeenCalledWith([undefined]);
    expect(screen.queryByRole('option', { name: /binding/i })).not.toBeInTheDocument();
  });
});

const renderEditColumnElementComponentSelect = (
  props: Partial<EditColumnElementComponentSelectProps> = {},
) => {
  return render(
    <EditColumnElementComponentSelect
      components={defaultComponents}
      onSelectComponent={jest.fn()}
      selectedComponentBindings={[]}
      filteredDatamodelBindings={[]}
      component={defaultComponents[0]}
      {...props}
    />,
  );
};

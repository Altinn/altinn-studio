import React from 'react';
import { render, screen } from '@testing-library/react';
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
  },
  {
    id: subformLayoutMock.component2Id,
    type: subformLayoutMock.component2.type,
    itemType: subformLayoutMock.component2.itemType,
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
      screen.getByRole('option', {
        name: textMock(
          'ux_editor.properties_panel.subform_table_columns.no_components_available_message',
        ),
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
});

const renderEditColumnElementComponentSelect = (
  props: Partial<EditColumnElementComponentSelectProps> = {},
) => {
  return render(
    <EditColumnElementComponentSelect
      components={defaultComponents}
      onSelectComponent={jest.fn()}
      {...props}
    />,
  );
};

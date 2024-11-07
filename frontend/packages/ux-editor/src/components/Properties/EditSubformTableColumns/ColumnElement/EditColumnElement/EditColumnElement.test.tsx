import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { layoutSet3SubformNameMock } from '../../../../../testing/layoutSetsMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { subformLayoutMock } from '../../../../../testing/subformLayoutMock';
import {
  EditColumnElementComponentSelect,
  type EditColumnElementComponentSelectProps,
} from './EditColumnElement';

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
      {...props}
    />,
    {
      ...queriesMock,
      queryClient,
    },
  );
};

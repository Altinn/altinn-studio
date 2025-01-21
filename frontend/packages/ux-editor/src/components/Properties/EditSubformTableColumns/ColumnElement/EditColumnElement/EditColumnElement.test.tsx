import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { subformLayoutMock } from '../../../../../testing/subformLayoutMock';
import {
  EditColumnElement,
  EditColumnElementComponentSelect,
  type EditColumnElementProps,
  type EditColumnElementComponentSelectProps,
} from './EditColumnElement';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

const defaultEditColumnProps: EditColumnElementProps = {
  sourceColumn: {
    cellContent: {
      query: '',
    },
    headerContent: '',
  },
  columnNumber: 1,
  onDeleteColumn: jest.fn(),
  onEdit: jest.fn(),
  subformLayout: 'subform_layout_id',
};

const textResources = {
  nb: [{ id: 'subform_table_column_title_123', value: 'title' }],
};

describe('EditColumnElement.tsx', () => {
  it('should render component selector when component not selected', async () => {
    renderEditColumnElement();
    const componentSelector = screen.getByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });
    expect(componentSelector).toBeInTheDocument();
  });

  it('should not render component selector when component already selected and saved', async () => {
    renderEditColumnElement({
      sourceColumn: {
        cellContent: {
          query: 'test',
        },
        headerContent: 'subform_table_column_title_3152',
      },
    });

    const componentSelector = screen.queryByRole('combobox', {
      name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
    });
    expect(componentSelector).not.toBeInTheDocument();
  });
});

const renderEditColumnElement = (props: Partial<EditColumnElementProps> = {}) => {
  queryClientMock.setQueryData([QueryKey.TextResources, org, app], textResources);
  return renderWithProviders(<EditColumnElement {...defaultEditColumnProps} {...props} />);
};

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
    renderEditColumnElementComponentSelect({
      components: [],
    });
    await selectComponentSelector();
    expect(screen.getByText(noComponentsMessage)).toBeInTheDocument();
  });

  it('should not render no components message when components are available', async () => {
    renderEditColumnElementComponentSelect();
    await selectComponentSelector();
    expect(screen.queryByRole('option', { name: noComponentsMessage })).not.toBeInTheDocument();
  });

  it('should render just components with labels', async () => {
    renderEditColumnElementComponentSelect();
    await selectComponentSelector();
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

const selectComponentSelector = async () => {
  const user = userEvent.setup();
  const componentSelector = screen.getByRole('combobox', {
    name: textMock('ux_editor.properties_panel.subform_table_columns.choose_component'),
  });
  expect(componentSelector).toBeInTheDocument();
  await user.click(componentSelector);
};

const noComponentsMessage = textMock(
  'ux_editor.properties_panel.subform_table_columns.no_components_available_message',
);

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

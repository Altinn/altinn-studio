import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { Summary2Override, type Summary2OverrideProps } from './Summary2Override';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import userEvent from '@testing-library/user-event';
import {
  component1IdMock,
  container1IdMock,
  layout1NameMock,
  layoutMock,
} from '../../../../../testing/layoutMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { layoutSet1NameMock } from '../../../../../testing/layoutSetsMock';
import { renderWithProviders } from '../../../../../testing/mocks';

describe('Summary2Override', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be able to add new override', async () => {
    const user = userEvent.setup();
    render();
    await user.click(addNewOverrideButton());
    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Object)]),
    );
  });

  it('should be able to remove override', async () => {
    render({
      overrides: [{ componentId: '1' }],
    });
    await userEvent.click(overrideCollapsedButton(1));
    await userEvent.click(removeOverrideButton());
    expect(defaultProps.onChange).toHaveBeenCalledWith([]);
  });

  it('should be able to show "vis type" comobox when componenetId is checkbox', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: 'Checkboxes', hidden: false }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(addNewOverrideButton());
    expect(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.component_properties.summary.override.display_type'),
      }),
    ).toBeInTheDocument();
  });

  it('should be able to show "vis type" comobox when componenetId is multipleSelect', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: 'MultipleSelect' }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(addNewOverrideButton());
    expect(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.component_properties.summary.override.display_type'),
      }),
    ).toBeInTheDocument();
  });

  it('should not show "vis type" comobox when componenetId is not checkbox or multipleSelect', async () => {
    render({ overrides: [{ componentId: '1' }] });
    await userEvent.click(overrideCollapsedButton(1));
    await userEvent.click(addNewOverrideButton());
    expect(
      screen.queryByRole('combobox', {
        name: textMock('ux_editor.component_properties.summary.override.display_type'),
      }),
    ).not.toBeInTheDocument();
  });

  it('should be able to change override componentId', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: '1' }] });
    const componentId = component1IdMock;
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(overrideComponentSelect());
    await user.click(
      screen.getByRole('option', {
        name: (content, _) => content.startsWith(componentId),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(expect.arrayContaining([{ componentId }])),
    );
  });

  it('should be able to change override hidden', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: '1', hidden: false }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(
      screen.getByRole('checkbox', {
        name: textMock('ux_editor.component_properties.summary.override.show_component'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: '1', hidden: true }]),
      ),
    );
  });

  it('should be able to change override hideEmptyFields', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: '1', hidden: false }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(
      screen.getByRole('checkbox', {
        name: textMock('ux_editor.component_properties.summary.override.hide_empty_fields'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          { componentId: '1', hideEmptyFields: true, hidden: false, forceShow: false },
        ]),
      ),
    );
  });

  it('"isCompact" checkbox should not be checked when isCompact is false', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: container1IdMock, isCompact: false }] });
    await userEvent.click(overrideCollapsedButton(1));
    const compactCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.summary.override.is_compact'),
    });
    expect(compactCheckbox).toBeInTheDocument();
    expect(compactCheckbox).not.toBeChecked();
    await user.click(compactCheckbox);
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: container1IdMock, isCompact: true }]),
      ),
    );
  });

  it('"isCompact" checkbox Should be checked when isCompact is true', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: container1IdMock, isCompact: true }] });
    await userEvent.click(overrideCollapsedButton(1));
    const compactCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.summary.override.is_compact'),
    });
    expect(compactCheckbox).toBeInTheDocument();
    expect(compactCheckbox).toBeChecked();
    await user.click(compactCheckbox);
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: container1IdMock, isCompact: false }]),
      ),
    );
  });

  it('should render the list of custom types', async () => {
    render({ overrides: [{ componentId: 'MultipleSelect' }] });
    await userEvent.click(overrideCollapsedButton(1));
    await userEvent.click(addNewOverrideButton());
    expect(
      screen.getByRole('option', {
        name: textMock('ux_editor.component_properties.summary.override.display_type.list'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: textMock('ux_editor.component_properties.summary.override.display_type.string'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: textMock('ux_editor.component_properties.summary.override.display_type.not_set'),
      }),
    ).toBeInTheDocument();
  });

  it('should be able to change override displayType when choosing list and componentId is MultipleSelect', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: 'MultipleSelect', displayType: 'list' }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(addNewOverrideButton());
    await user.click(
      screen.getByRole('option', {
        name: textMock('ux_editor.component_properties.summary.override.display_type.list'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: 'MultipleSelect', displayType: 'list' }]),
      ),
    );
  });

  it('should be able to change override displayType when choosing string and componentId is MultipleSelect', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: 'MultipleSelect', displayType: 'string' }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(addNewOverrideButton());
    await user.click(
      screen.getByRole('option', {
        name: textMock('ux_editor.component_properties.summary.override.display_type.string'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: 'MultipleSelect', displayType: 'string' }]),
      ),
    );
  });

  it('should be able to change override displayType when choosing notSet and componentId is MultipleSelect', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: 'MultipleSelect', displayType: 'notSet' }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(addNewOverrideButton());
    await user.click(
      screen.getByRole('option', {
        name: textMock('ux_editor.component_properties.summary.override.display_type.not_set'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: 'MultipleSelect', displayType: 'notSet' }]),
      ),
    );
  });

  it('should be able to change override displayType when choosing list and componentId is Checkboxes', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: 'Checkboxes', displayType: 'list' }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(addNewOverrideButton());
    await user.click(
      screen.getByRole('option', {
        name: textMock('ux_editor.component_properties.summary.override.display_type.list'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: 'Checkboxes', displayType: 'list' }]),
      ),
    );
  });

  it('should be able to change override displayType when choosing string and componentId is Checkboxes', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: 'Checkboxes', displayType: 'string' }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(addNewOverrideButton());
    await user.click(
      screen.getByRole('option', {
        name: textMock('ux_editor.component_properties.summary.override.display_type.string'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: 'Checkboxes', displayType: 'string' }]),
      ),
    );
  });

  it('should be able to change override displayType when choosing notSet and componentId is Checkboxes', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: 'Checkboxes', displayType: 'notSet' }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(addNewOverrideButton());
    await user.click(
      screen.getByRole('option', {
        name: textMock('ux_editor.component_properties.summary.override.display_type.not_set'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: 'Checkboxes', displayType: 'notSet' }]),
      ),
    );
  });

  it('should displayType have a new option value when user select a new option.', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: 'Checkboxes', displayType: 'string' }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(addNewOverrideButton());
    await user.click(
      screen.getByRole('option', {
        name: textMock('ux_editor.component_properties.summary.override.display_type.string'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: 'Checkboxes', displayType: 'string' }]),
      ),
    );
  });

  it('should handle custom type change', async () => {
    const user = userEvent.setup();
    render({ overrides: [{ componentId: 'Checkboxes' }] });
    await userEvent.click(overrideCollapsedButton(1));
    await user.click(addNewOverrideButton());

    const select = screen.getByRole('combobox', {
      name: textMock('ux_editor.component_properties.summary.override.display_type'),
    });
    await user.selectOptions(select, 'list');
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: 'Checkboxes', displayType: 'list' }]),
      ),
    );
  });

  it('should be able to change override emptyFieldText', async () => {
    const user = userEvent.setup();
    render({
      overrides: [{ componentId: '1', hidden: false, hideEmptyFields: false }],
    });
    await userEvent.click(overrideCollapsedButton(1));
    const emptyFieldText = 'asdf;ljr%';
    const textFieldButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.summary.override.empty_field_text'),
    });
    await user.click(textFieldButton);
    await user.type(
      screen.getByLabelText(
        textMock('ux_editor.component_properties.summary.override.empty_field_text'),
      ),
      emptyFieldText,
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          { componentId: '1', emptyFieldText, hidden: false, hideEmptyFields: false },
        ]),
      ),
    );
  });

  it('should show info message when hideEmptyFields is true', async () => {
    render({ overrides: [{ componentId: '1', hideEmptyFields: true }] });
    await userEvent.click(overrideCollapsedButton(1));
    expect(
      screen.getByText(
        textMock('ux_editor.component_properties.summary.override.hide_empty_fields.info_message'),
      ),
    ).toBeInTheDocument();
  });

  it('should collapse and uncollapse override', async () => {
    render({ overrides: [{ componentId: '1' }] });
    await userEvent.click(overrideCollapsedButton(1));
    expect(
      screen.queryByRole('button', {
        name: textMock('ux_editor.component_properties.summary.overrides.nth.*:1}'),
      }),
    ).not.toBeInTheDocument();
    await userEvent.click(overrideCloseButton());
    expect(
      screen.queryByRole('button', {
        name: textMock('ux_editor.component_properties.summary.overrides.nth.*:1}'),
      }),
    ).not.toBeInTheDocument();
  });
});

const overrideCloseButton = () =>
  screen.getByRole('button', {
    name: /general.save/i,
  });

const overrideCollapsedButton = (n: number) =>
  screen.getByRole('button', {
    name: new RegExp(`ux_editor.component_properties.summary.overrides.nth.*:${n}}`),
  });

const addNewOverrideButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.component_properties.summary.add_override'),
  });

const removeOverrideButton = () => screen.getByRole('button', { name: '' });

const overrideComponentSelect = () =>
  screen.getByRole('combobox', {
    name: textMock('ux_editor.component_properties.summary.override.choose_component'),
  });

const defaultProps = {
  overrides: [],
  onChange: jest.fn(),
};
const render = (props?: Partial<Summary2OverrideProps>) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSet1NameMock], {
    [layout1NameMock]: layoutMock,
  });
  renderWithProviders(<Summary2Override {...defaultProps} {...props} />, {
    queryClient,
    appContextProps: {
      selectedFormLayoutSetName: layoutSet1NameMock,
      selectedFormLayoutName: layout1NameMock,
    },
  });
};

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
  componentWithOptionsMock,
  componentWithMultipleSelectMock,
  layout1NameMock,
  layoutMock,
  container2IdMock,
  subformComponentMock,
} from '../../../../../testing/layoutMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { layoutSet1NameMock, layoutSetsExtendedMock } from '../../../../../testing/layoutSetsMock';
import { renderWithProviders } from '../../../../../testing/mocks';
import type {
  OverrideDisplay,
  OverrideDisplayType,
  Summary2TargetConfig,
} from 'app-shared/types/ComponentSpecificConfig';
import { ComponentType } from 'app-shared/types/ComponentType';

const checkBoxId = componentWithOptionsMock.id;
const multipleSelectId = componentWithMultipleSelectMock.id;
const subformComponentId = subformComponentMock.id;
const repeatingGroupComponentId = container2IdMock;
const layoutMockWithMultipleSelect = {
  ...layoutMock,
  components: {
    ...layoutMock.components,
    [multipleSelectId]: componentWithMultipleSelectMock,
    [subformComponentId]: subformComponentMock,
  },
};

describe('Summary2Override', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be able to add new override', async () => {
    const user = userEvent.setup();
    render();
    await user.click(addNewOverrideButton());
    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: [expect.any(Object)],
      }),
    );
  });

  it('should be able to remove override', async () => {
    const user = userEvent.setup();
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: '1' }],
    };
    render({ component });
    await user.click(overrideCollapsedButton(1));
    await user.click(removeOverrideButton());
    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: [],
      }),
    );
  });

  it.each([checkBoxId, multipleSelectId])(
    'should render type options when component is %s',
    async (componentId) => {
      const user = userEvent.setup();
      const component = {
        ...defaultProps.component,
        overrides: [{ componentId }],
      };
      render({ component });

      await user.click(overrideCollapsedButton(1));
      await user.click(overrideDisplayTypeSelector());
      expect(renderedTypeOptions()).toBeTruthy();
    },
  );

  it('should not render type selector when component is not multiple select nor checkbox', async () => {
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: component1IdMock }],
    };
    render({ component });
    await userEvent.click(overrideCollapsedButton(1));

    expect(
      screen.queryByRole('combobox', {
        name: textMock('ux_editor.component_properties.summary.override.display_type'),
      }),
    ).not.toBeInTheDocument();
  });

  it('should be able to change override componentId', async () => {
    const user = userEvent.setup();
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: '1' }],
      target: { type: 'layoutSet' } as Summary2TargetConfig,
    };
    render({ component });
    const componentId = component1IdMock;
    await user.click(overrideCollapsedButton(1));
    await user.click(overrideComponentSelect());
    await user.click(
      screen.getByRole('option', {
        name: (content, _) => content.startsWith(componentId),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({ overrides: [{ componentId }] }),
      ),
    );
  });

  it('should be able to change override hidden', async () => {
    const user = userEvent.setup();
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: '1', hidden: false }],
    };
    render({ component });
    await user.click(overrideCollapsedButton(1));
    await user.click(
      screen.getByRole('checkbox', {
        name: textMock('ux_editor.component_properties.summary.override.show_component'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          overrides: [{ componentId: '1', hidden: true }],
        }),
      ),
    );
  });

  it('"isCompact" checkbox should not be checked when isCompact is false', async () => {
    const user = userEvent.setup();
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: container1IdMock, isCompact: false }],
    };
    render({ component });
    await user.click(overrideCollapsedButton(1));
    const compactCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.summary.override.is_compact'),
    });
    expect(compactCheckbox).toBeInTheDocument();
    expect(compactCheckbox).not.toBeChecked();
    await user.click(compactCheckbox);
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          overrides: [{ componentId: container1IdMock, isCompact: true }],
        }),
      ),
    );
  });

  it('"isCompact" checkbox should be checked when isCompact is true', async () => {
    const user = userEvent.setup();
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: container1IdMock, isCompact: true }],
    };
    render({ component });
    await user.click(overrideCollapsedButton(1));
    const compactCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.summary.override.is_compact'),
    });
    expect(compactCheckbox).toBeInTheDocument();
    expect(compactCheckbox).toBeChecked();
    await user.click(compactCheckbox);
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          overrides: [{ componentId: container1IdMock, isCompact: false }],
        }),
      ),
    );
  });

  it('should be able to override display type when component type is multiple select', async () => {
    const user = userEvent.setup();
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: multipleSelectId }],
    };
    render({ component });
    await user.click(overrideCollapsedButton(1));
    await user.selectOptions(overrideDisplayTypeSelector(), overrideDisplayType('string'));

    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: [{ componentId: multipleSelectId, displayType: 'string' }],
      }),
    );
  });

  it('should be able to override display type when component type is checkbox', async () => {
    const user = userEvent.setup();
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: checkBoxId }],
    };
    render({ component });
    await user.click(overrideCollapsedButton(1));
    await user.selectOptions(overrideDisplayTypeSelector(), overrideDisplayType('string'));

    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          overrides: [{ componentId: checkBoxId, displayType: 'string' }],
        }),
      ),
    );
  });

  it('should collapse and uncollapse override', async () => {
    const user = userEvent.setup();
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: '1' }],
    };
    render({ component });
    await user.click(overrideCollapsedButton(1));
    expect(
      screen.queryByRole('button', {
        name: textMock('ux_editor.component_properties.summary.overrides.nth.*:1}'),
      }),
    ).not.toBeInTheDocument();
    await user.click(overrideCloseButton());
    expect(
      screen.queryByRole('button', {
        name: textMock('ux_editor.component_properties.summary.overrides.nth.*:1}'),
      }),
    ).not.toBeInTheDocument();
  });

  it('should render component specific overrides', async () => {
    const user = userEvent.setup();
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: repeatingGroupComponentId }],
    };
    render({ component });

    await user.click(overrideCollapsedButton(1));
    await user.selectOptions(overrideDisplaySelector(), overrideDisplaySelectType('table'));

    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: [{ componentId: repeatingGroupComponentId, display: 'table' }],
      }),
    );
  });

  it('clicking Save in Summary2OverrideEntry closes the entry', async () => {
    const user = userEvent.setup();
    const textSaveButton = textMock('ux_editor.component_properties.summary.override.save_button');
    const textCancelButton = textMock(
      'ux_editor.component_properties.summary.override.delete_button',
    );
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: '1' }],
    };
    render({ component });

    expect(screen.queryByRole('button', { name: textSaveButton })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: textCancelButton })).not.toBeInTheDocument();
    await user.click(overrideCollapsedButton(1));
    expect(screen.getByRole('button', { name: textSaveButton })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textCancelButton })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: textSaveButton }));
    expect(screen.queryByRole('button', { name: textSaveButton })).not.toBeInTheDocument();
  });

  it.each([
    {
      componentId: repeatingGroupComponentId,
      defaultProps: { componentId: repeatingGroupComponentId, display: 'full' },
    },
    {
      componentId: subformComponentId,
      defaultProps: { componentId: subformComponentId, display: 'table' },
    },
    {
      componentId: multipleSelectId,
      defaultProps: { componentId: multipleSelectId, displayType: 'list' },
    },
  ])('should set default props for components', async (args) => {
    const user = userEvent.setup();
    const component = {
      ...defaultProps.component,
      overrides: [{ componentId: component1IdMock }],
    };
    render({ component });

    await user.click(overrideCollapsedButton(1));
    await user.click(overrideComponentSelect());
    await user.click(
      screen.getByRole('option', {
        name: new RegExp(args.componentId),
      }),
    );

    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          overrides: [expect.objectContaining(args.defaultProps)],
        }),
      ),
    );
  });
});

const overrideCloseButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.component_properties.summary.override.delete_button'),
  });

const overrideCollapsedButton = (n: number) =>
  screen.getByRole('button', {
    name: new RegExp(`ux_editor.component_properties.summary.overrides.nth.*:${n}}`),
  });

const addNewOverrideButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.component_properties.summary.add_override'),
  });

const removeOverrideButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.component_properties.summary.override.delete_button'),
  });

const overrideComponentSelect = () =>
  screen.getByRole('combobox', {
    name: textMock('ux_editor.component_properties.summary.override.choose_component'),
  });

const overrideDisplaySelector = () =>
  screen.getByRole('combobox', {
    name: textMock('ux_editor.component_properties.summary.override.display'),
  });

const overrideDisplaySelectType = (type: OverrideDisplay) =>
  screen.getByRole('option', {
    name: textMock(`ux_editor.component_properties.summary.override.display.${type}`),
  });

const overrideDisplayTypeSelector = () =>
  screen.getByRole('combobox', {
    name: textMock('ux_editor.component_properties.summary.override.display_type'),
  });

const overrideDisplayType = (type: OverrideDisplayType) =>
  screen.getByRole('option', {
    name: textMock(`ux_editor.component_properties.summary.override.display_type.${type}`),
  });

const renderedTypeOptions = () => {
  const expectedOptions = ['list', 'string'].map((type) =>
    textMock(`ux_editor.component_properties.summary.override.display_type.${type}`),
  );

  const renderedOptions = screen.getAllByRole('option').map((option) => option.textContent);
  return expectedOptions.every((option) => renderedOptions.includes(option));
};

const defaultProps: Summary2OverrideProps = {
  component: {
    id: '1',
    itemType: 'COMPONENT',
    type: ComponentType.Summary2,
    overrides: [],
    target: {},
  },
  onChange: jest.fn(),
};
const render = (props?: Partial<Summary2OverrideProps>) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSet1NameMock], {
    [layout1NameMock]: layoutMockWithMultipleSelect,
  });
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);
  renderWithProviders(<Summary2Override {...defaultProps} {...props} />, {
    queryClient,
    appContextProps: {
      selectedFormLayoutSetName: layoutSet1NameMock,
      selectedFormLayoutName: layout1NameMock,
    },
  });
};

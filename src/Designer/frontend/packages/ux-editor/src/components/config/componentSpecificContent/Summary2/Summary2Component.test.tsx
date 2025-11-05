import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { screen, waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { QueryKey } from 'app-shared/types/QueryKey';
import React from 'react';
import { componentMocks } from '../../../../testing/componentMocks';
import { component1IdMock, layout1NameMock, layoutMock } from '../../../../testing/layoutMock';
import {
  layoutSet1NameMock,
  layoutSet2NameMock,
  layoutSetsExtendedMock,
  layoutSetsMock,
} from '../../../../testing/layoutSetsMock';
import { renderWithProviders } from '../../../../testing/mocks';
import type { IGenericEditComponent } from '../../componentConfig';
import { Summary2Component } from './Summary2Component';
import userEvent from '@testing-library/user-event';

describe('Summary2ComponentTargetSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render', async () => {
    render();

    expect(
      screen.getByRole('heading', { name: textMock('ux_editor.component_properties.target') }),
    ).toBeInTheDocument();

    expect(targetTaskIdSelect()).toBeInTheDocument();

    expect(targetTypeSelect()).toBeInTheDocument();

    expect(addNewOverrideButton()).toBeInTheDocument();

    expect(disabledLayoutSetTargetSelect()).toBeInTheDocument();
  });

  it('should select the task id from the current layout when the task id of the target is not defined', async () => {
    render();

    const select = targetTaskIdSelect();
    expect(select).toHaveValue('');
    expect(select).toHaveTextContent(layoutSetsMock.sets[0].id);
  });

  it('should select the task id from the target when the task id of the target is defined', async () => {
    render({
      component: { ...defaultProps.component, target: { taskId: 'Task_2' } },
    });

    const select = targetTaskIdSelect();
    expect(select).toHaveValue(layoutSetsMock.sets[1].tasks[0]);
  });

  it('should allow selecting a layout set', async () => {
    const user = userEvent.setup();
    render({
      component: { ...defaultProps.component, target: { type: 'component', id: component1IdMock } },
    });

    await user.selectOptions(targetTaskIdSelect(), layoutSet2NameMock);
    expect(defaultProps.handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { taskId: 'Task_2', type: 'component' } }),
    );
  });

  it('should defaults to page target and disabled target select', async () => {
    render();
    expect(targetTypeSelect()).toHaveValue('layoutSet');
    expect(disabledLayoutSetTargetSelect()).toBeDisabled();
    expect(disabledLayoutSetTargetSelect()).toHaveValue(layoutSet1NameMock);
  });

  it('should allow selecting layoutSet target', async () => {
    const user = userEvent.setup();
    render();

    await user.selectOptions(targetTypeSelect(), 'layoutSet');
    expect(defaultProps.handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { type: 'layoutSet' } }),
    );
  });

  it('should allow selecting component target', async () => {
    const user = userEvent.setup();
    render({
      component: { ...defaultProps.component, target: { type: 'component', id: component1IdMock } },
    });

    await user.selectOptions(targetTypeSelect(), 'component');
    const componentId = component1IdMock;

    await user.click(componentTargetSelect());
    await user.click(
      screen.getByRole('option', {
        name: (content, _) => content.startsWith(componentId),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.handleComponentChange).toHaveBeenCalledWith(
        expect.objectContaining({ target: { type: 'component', id: componentId } }),
      ),
    );
  });

  it('should allow selecting page target', async () => {
    const user = userEvent.setup();
    render({
      component: { ...defaultProps.component, target: { type: 'page', id: layout1NameMock } },
    });

    const pageId = layout1NameMock;

    await user.click(pageTargetSelect());
    await user.click(
      screen.getByRole('option', {
        name: (content, _) => content.startsWith(pageId),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.handleComponentChange).toHaveBeenCalledWith(
        expect.objectContaining({ target: { type: 'page', id: pageId } }),
      ),
    );
  });

  it('should show error if page target is invalid', async () => {
    render({
      component: { ...defaultProps.component, target: { type: 'page', id: 'invalid' } },
    });
    expect(
      screen.getByText(textMock('ux_editor.component_properties.target_invalid')),
    ).toBeInTheDocument();
  });

  it('should show error if component target is invalid', async () => {
    render({
      component: { ...defaultProps.component, target: { type: 'component', id: 'invalid' } },
    });
    expect(
      screen.getByText(textMock('ux_editor.component_properties.target_invalid')),
    ).toBeInTheDocument();
  });

  it('can add new override', async () => {
    const user = userEvent.setup();
    render();
    await user.click(addNewOverrideButton());
    expect(defaultProps.handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ overrides: expect.arrayContaining([expect.any(Object)]) }),
    );
  });
});

const targetTaskIdSelect = () =>
  screen.getByRole('combobox', {
    name: textMock('ux_editor.component_properties.target_layoutSet_id'),
  });

const targetTypeSelect = () =>
  screen.getByRole('combobox', {
    name: textMock('ux_editor.component_properties.target_type'),
  });

const componentTargetSelect = () =>
  screen.getByRole('combobox', {
    name: textMock('ux_editor.component_properties.target_unit_component'),
  });

const pageTargetSelect = () =>
  screen.getByRole('combobox', {
    name: textMock('ux_editor.component_properties.target_unit_page'),
  });

const disabledLayoutSetTargetSelect = () =>
  screen.getByRole('textbox', {
    name: textMock('ux_editor.component_properties.target_unit_layout_set'),
  });

const addNewOverrideButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.component_properties.summary.add_override'),
  });

const defaultProps = {
  component: componentMocks[ComponentType.Summary2],
  handleComponentChange: jest.fn(),
};
const render = (props?: Partial<IGenericEditComponent<ComponentType.Summary2>>) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSet1NameMock], {
    [layout1NameMock]: layoutMock,
  });
  renderWithProviders(<Summary2Component {...defaultProps} {...props} />, {
    queryClient,
    appContextProps: {
      selectedFormLayoutName: layout1NameMock,
    },
  });
};

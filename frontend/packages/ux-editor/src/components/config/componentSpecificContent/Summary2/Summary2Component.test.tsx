import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { screen, waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { QueryKey } from 'app-shared/types/QueryKey';
import React from 'react';
import { componentMocks } from '../../../../testing/componentMocks';
import { component1IdMock, layout1NameMock, layoutMock } from '../../../../testing/layoutMock';
import { layoutSet1NameMock, layoutSetsMock } from '../../../../testing/layoutSetsMock';
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

    expect(componentTargetSelect()).toBeInTheDocument();
  });

  it('should allow selecting a task id', async () => {
    const user = userEvent.setup();
    render();

    await user.selectOptions(targetTaskIdSelect(), 'Task_2');
    expect(defaultProps.handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { taskId: 'Task_2', type: 'component', id: '' } }),
    );
  });

  it('should remove the task id from the target if the task id is the same as the current layout set', async () => {
    const user = userEvent.setup();
    render();

    await user.selectOptions(targetTaskIdSelect(), 'Task_1');
    expect(defaultProps.handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { type: 'component', id: '' } }),
    );
  });

  it('should allow selecting page target and defaults to same page', async () => {
    const user = userEvent.setup();
    render();

    await user.selectOptions(targetTypeSelect(), 'page');
    expect(defaultProps.handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { type: 'page', id: layout1NameMock } }),
    );
  });

  it('should allow selecting layoutSet target', async () => {
    const user = userEvent.setup();
    render();

    await user.selectOptions(targetTypeSelect(), 'layoutSet');
    expect(defaultProps.handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { type: 'layoutSet', id: '' } }),
    );
  });

  it('should allow selecting component target', async () => {
    const user = userEvent.setup();
    render();

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
    name: textMock('ux_editor.component_properties.target_taskId'),
  });

const targetTypeSelect = () =>
  screen.getByRole('combobox', {
    name: textMock('ux_editor.component_properties.target_type'),
  });

const componentTargetSelect = () =>
  screen.getByRole('combobox', {
    name: textMock('general.component'),
  });

const pageTargetSelect = () =>
  screen.getByRole('combobox', {
    name: textMock('general.page'),
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
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSet1NameMock], {
    [layout1NameMock]: layoutMock,
  });
  renderWithProviders(<Summary2Component {...defaultProps} {...props} />, {
    queryClient,
    appContextProps: {
      selectedFormLayoutSetName: layoutSet1NameMock,
      selectedFormLayoutName: layout1NameMock,
    },
  });
};

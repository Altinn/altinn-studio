import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { screen, waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { QueryKey } from 'app-shared/types/QueryKey';
import React from 'react';
import { componentMocks } from '../../../../testing/componentMocks';
import {
  component1IdMock,
  layout1NameMock,
  layout2NameMock,
  layoutMock,
} from '../../../../testing/layoutMock';
import { layoutSet1NameMock } from '../../../../testing/layoutSetsMock';
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

    expect(targetTypeSelect()).toBeInTheDocument();

    expect(componentTargetSelect()).toBeInTheDocument();
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
      expect.objectContaining({ target: { type: 'layoutSet' } }),
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

    const pageId = layout2NameMock;

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

const defaultProps = {
  component: componentMocks[ComponentType.Summary2],
  handleComponentChange: jest.fn(),
};
const render = (props?: Partial<IGenericEditComponent<ComponentType.Summary2>>) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSet1NameMock], {
    [layout1NameMock]: layoutMock,
    [layout2NameMock]: layoutMock,
  });
  renderWithProviders(<Summary2Component {...defaultProps} {...props} />, {
    queryClient,
    appContextProps: {
      selectedFormLayoutSetName: layoutSet1NameMock,
      selectedFormLayoutName: layout1NameMock,
    },
  });
};

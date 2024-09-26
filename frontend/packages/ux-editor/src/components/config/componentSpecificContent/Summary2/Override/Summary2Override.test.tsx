import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { Summary2Override, type Summary2OverrideProps } from './Summary2Override';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import userEvent from '@testing-library/user-event';
import { component1IdMock, layout1NameMock, layoutMock } from '../../../../../testing/layoutMock';
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
    await userEvent.click(removeOverrideButton());
    expect(defaultProps.onChange).toHaveBeenCalledWith([]);
  });

  it('should be able to change override componentId', async () => {
    const user = userEvent.setup();
    render({
      overrides: [{ componentId: '1' }],
    });
    const componentId = component1IdMock;
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
    render({
      overrides: [{ componentId: '1' }],
    });
    await user.click(
      screen.getByRole('checkbox', {
        name: textMock('ux_editor.component_properties.summary.override.hidden'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: '1', hidden: true }]),
      ),
    );
  });

  it('should be able to change override forceShow', async () => {
    const user = userEvent.setup();
    render({
      overrides: [{ componentId: '1' }],
    });
    await user.click(
      screen.getByRole('checkbox', {
        name: textMock('ux_editor.component_properties.summary.override.force_show'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: '1', forceShow: true }]),
      ),
    );
  });

  it('should be able to change override hideEmptyFields', async () => {
    const user = userEvent.setup();
    render({
      overrides: [{ componentId: '1' }],
    });
    await user.click(
      screen.getByRole('checkbox', {
        name: textMock('ux_editor.component_properties.summary.override.hide_empty_fields'),
      }),
    );
    await waitFor(() =>
      expect(defaultProps.onChange).toHaveBeenCalledWith(
        expect.arrayContaining([{ componentId: '1', hideEmptyFields: true }]),
      ),
    );
  });
});

const addNewOverrideButton = () =>
  screen.getByRole('button', {
    name: textMock('ux_editor.component_properties.summary.add_override'),
  });

const removeOverrideButton = () => screen.getByRole('button', { name: '' });

const overrideComponentSelect = () =>
  screen.getByRole('combobox', {
    name: textMock('ux_editor.component_properties.summary.override.component_id'),
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

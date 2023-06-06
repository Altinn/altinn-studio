import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelComponent } from './PanelComponent';
import { FormPanelComponent, FormPanelVariant } from '../../../../types/FormComponent';
import { renderHookWithMockStore, renderWithMockStore } from '../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useFormLayoutsQuery } from '../../../../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

const component: FormPanelComponent = {
  id: '',
  itemType: 'COMPONENT',
  type: ComponentType.Panel,
  dataModelBindings: {},
  variant: FormPanelVariant.Info,
  showIcon: false,
};

const mockHandleComponentChange = jest.fn();

const user = userEvent.setup();

const waitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const settingsResult = renderHookWithMockStore()(() => useFormLayoutSettingsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async () => {
  await waitForData();
  renderWithMockStore()(<PanelComponent component={component} handleComponentChange={mockHandleComponentChange} />);
}

describe('PanelComponent', () => {
  afterEach(jest.clearAllMocks);

  it('should call handleComponentChange with showIcon property set to true when the showIcon checkbox is clicked', async () => {
    await render();

    const checkbox = screen.getByLabelText(textMock('ux_editor.show_icon'));

    await act(() => user.click(checkbox));

    expect(mockHandleComponentChange).toHaveBeenCalledTimes(1);
    expect(mockHandleComponentChange).toHaveBeenCalledWith({ ...component, showIcon: true });
  });

  it('should call handleComponentChange with the selected variant when a different variant is selected', async () => {
    await render();

    const select = screen.getByRole('combobox', {
      name: textMock('ux_editor.choose_variant'),
    });
    await act(() => user.click(select));
    await act(() => user.click(screen.getAllByRole('option')[1]));

    expect(mockHandleComponentChange).toHaveBeenCalledTimes(1);
    expect(mockHandleComponentChange).toHaveBeenCalledWith({ ...component, variant: FormPanelVariant.Warning });
  });
});

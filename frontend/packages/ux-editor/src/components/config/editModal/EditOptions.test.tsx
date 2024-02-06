import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';

import { EditOptions } from './EditOptions';
import { renderWithMockStore, renderHookWithMockStore } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type {
  FormCheckboxesComponent,
  FormRadioButtonsComponent,
} from '../../../types/FormComponent';

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const mockComponent: FormCheckboxesComponent | FormRadioButtonsComponent = {
  id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
  type: ComponentType.RadioButtons,
  textResourceBindings: {
    title: 'ServiceName',
  },
  maxLength: 10,
  itemType: 'COMPONENT',
  dataModelBindings: {},
};

const render = async ({ component = mockComponent, handleComponentChange = jest.fn() } = {}) => {
  await waitForData();

  return renderWithMockStore()(
    <EditOptions handleComponentChange={handleComponentChange} component={component} />,
  );
};

describe('EditOptions', () => {
  it('should render', async () => {
    await render();
    expect(
      screen.getByText(textMock('ux_editor.properties_panel.options.use_code_list_label')),
    ).toBeInTheDocument();
  });

  it('should show code list input by default when neither options nor optionId are set', async () => {
    await render();
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_custom_code_list_id')),
    ).toBeInTheDocument();
  });

  it('should show manual input when component has options defined', async () => {
    await render({
      component: {
        ...mockComponent,
        options: [{ label: 'option1', value: 'option1' }],
        optionsId: undefined,
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.properties_panel.options.add_options')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('ux_editor.modal_radio_button_increment') + ' 1'),
    ).toBeInTheDocument();
  });

  it('should show code list input when component has optionsId defined', async () => {
    await render({
      component: {
        ...mockComponent,
        optionsId: 'optionsId',
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_custom_code_list_id')),
    ).toBeInTheDocument();
  });

  it('should switch to manual input when toggling codelist switch off', async () => {
    const handleComponentChange = jest.fn();
    await render({ handleComponentChange });
    const switchElement = screen.getByRole('checkbox');
    await act(() => switchElement.click());
    expect(handleComponentChange).toHaveBeenCalledWith({ ...mockComponent, options: [] });
  });

  it('should switch to codelist input when toggling codelist switch on', async () => {
    const handleComponentChange = jest.fn();
    await render({
      handleComponentChange,
      component: {
        ...mockComponent,
        options: [{ label: 'option1', value: 'option1' }],
        optionsId: undefined,
      },
    });
    const switchElement = screen.getByRole('checkbox');
    await act(() => switchElement.click());
    expect(handleComponentChange).toHaveBeenCalledWith({ ...mockComponent, optionsId: '' });
  });

  it('should update component options when adding new option', async () => {
    const handleComponentChange = jest.fn();
    await render({
      handleComponentChange,
      component: {
        ...mockComponent,
        options: [{ label: 'option1', value: 'option1' }],
      },
    });
    const addOptionButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_new_option'),
    });
    await act(() => addOptionButton.click());
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      options: expect.arrayContaining([
        { label: 'option1', value: 'option1' },
        expect.objectContaining({ label: '' }),
      ]),
    });
  });

  it('should update component options when removing option', async () => {
    const handleComponentChange = jest.fn();
    await render({
      handleComponentChange,
      component: {
        ...mockComponent,
        options: [{ label: 'option1', value: 'option1' }],
      },
    });
    const removeOptionButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.options.remove_option'),
    });
    await act(() => removeOptionButton.click());
    expect(handleComponentChange).toHaveBeenCalledWith({ ...mockComponent, options: [] });
  });
});

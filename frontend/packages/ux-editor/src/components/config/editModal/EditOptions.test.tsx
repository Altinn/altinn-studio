import React from 'react';
import { act, screen } from '@testing-library/react';

import { EditOptions } from './EditOptions';
import { renderWithMockStore } from '../../../testing/mocks';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormRadioButtonsComponent } from '../../../types/FormComponent';

const mockComponent: FormRadioButtonsComponent = {
  id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
  type: ComponentType.RadioButtons,
  textResourceBindings: {
    title: 'ServiceName',
  },
  maxLength: 10,
  itemType: 'COMPONENT',
  dataModelBindings: {},
};

const renderEditOptions = ({ component = mockComponent, handleComponentChange = jest.fn() } = {}) =>
  renderWithMockStore()(
    <EditOptions handleComponentChange={handleComponentChange} component={component} />,
  );

describe('EditOptions', () => {
  it('should render', () => {
    renderEditOptions();
    expect(
      screen.getByText(textMock('ux_editor.properties_panel.options.use_code_list_label')),
    ).toBeInTheDocument();
  });

  it('should show code list input by default when neither options nor optionId are set', () => {
    renderEditOptions();
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_custom_code_list_id')),
    ).toBeInTheDocument();
  });

  it('should not show error message when code list input is enabled', async () => {
    renderEditOptions();
    screen.getByText(textMock('ux_editor.modal_properties_custom_code_list_id'));
    expect(
      screen.queryByText(textMock('ux_editor.radios_error_NoOptions')),
    ).not.toBeInTheDocument();
  });

  it('should show error message when manual options are enabled by switch', async () => {
    renderEditOptions();
    expect(
      screen.queryByText(textMock('ux_editor.checkboxes_error_noOptions')),
    ).not.toBeInTheDocument();
    const switchElement = screen.getByRole('checkbox');
    await act(() => switchElement.click());
    screen.getByText(textMock('ux_editor.radios_error_NoOptions'));
  });

  it('should show manual input when component has options defined', async () => {
    renderEditOptions({
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
    renderEditOptions({
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
    renderEditOptions({ handleComponentChange });
    const switchElement = screen.getByRole('checkbox');
    await act(() => switchElement.click());
    expect(handleComponentChange).toHaveBeenCalledWith({ ...mockComponent, options: [] });
  });

  it('should switch to codelist input when toggling codelist switch on', async () => {
    const handleComponentChange = jest.fn();
    renderEditOptions({
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
    renderEditOptions({
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
    renderEditOptions({
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

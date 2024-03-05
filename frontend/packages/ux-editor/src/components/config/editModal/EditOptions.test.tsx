import React from 'react';
import { act, screen, within } from '@testing-library/react';

import { EditOptions } from './EditOptions';
import { renderWithMockStore } from '../../../testing/mocks';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormRadioButtonsComponent } from '../../../types/FormComponent';
import userEvent from '@testing-library/user-event';

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

  it('should show code list input by default when neither options nor optionId are set', async () => {
    renderEditOptions();
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_custom_code_list_id')),
    ).toBeInTheDocument();
  });

  it('should show manual input when component has options defined', async () => {
    renderEditOptions({
      component: {
        ...mockComponent,
        options: [{ label: 'option1', value: 'option1' }],
        optionsId: undefined,
      },
    });
    screen.getByRole('button', { name: textMock('ux_editor.modal_new_option') });
    screen.getByRole('button', { name: textMock('ux_editor.radios_option', { optionNumber: 1 }) });
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
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    renderEditOptions({
      handleComponentChange,
      component: {
        ...mockComponent,
        options: [{ label: 'option1', value: 'option1' }],
      },
    });
    const optionLabel = textMock('ux_editor.radios_option', { optionNumber: 1 });
    const optionButton = screen.getByRole('button', { name: optionLabel });
    await act(() => user.click(optionButton));
    const optionFieldset = screen.getByRole('group', { name: optionLabel });
    const removeButtonLabel = textMock('general.delete');
    const removeOptionButton = within(optionFieldset).getByRole('button', {
      name: removeButtonLabel,
    });
    await act(() => user.click(removeOptionButton));
    expect(handleComponentChange).toHaveBeenCalledWith({ ...mockComponent, options: [] });
  });
});

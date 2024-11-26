import React from 'react';
import { screen } from '@testing-library/react';
import { ManualTab } from './ManualTab';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../../../../types/FormItem';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { FormComponent } from '../../../../../../types/FormComponent';
import userEvent from '@testing-library/user-event';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';

// Test data:
const mockComponent: FormComponent<ComponentType.RadioButtons> =
  componentMocks[ComponentType.RadioButtons];
mockComponent.optionsId = undefined;
mockComponent.options = undefined;

const handleComponentChange = jest.fn();

describe('ManualTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('should show manual input when component has options defined', async () => {
    renderEditManualOptions({
      componentProps: {
        options: [{ label: 'option1', value: 'option1' }],
      },
    });
    screen.getByRole('button', { name: textMock('ux_editor.modal_new_option') });
    screen.getByRole('button', { name: textMock('ux_editor.radios_option', { optionNumber: 1 }) });
  });

  it('should show manual input when options list has length 0', async () => {
    renderEditManualOptions({
      componentProps: {
        options: [],
      },
    });
    screen.getByRole('button', { name: textMock('ux_editor.modal_new_option') });
  });

  it('should call handleComponentUpdate when adding a new option', async () => {
    renderEditManualOptions({
      componentProps: {
        options: [{ label: 'oldOption', value: 'oldOption' }],
      },
    });

    const addOptionButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_new_option'),
    });
    addOptionButton.click();
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      options: [
        { label: 'oldOption', value: 'oldOption' },
        { label: expect.any(String), value: expect.any(String) },
      ],
    });
  });

  it('should call handleComponentUpdate when removing an option', async () => {
    const user = userEvent.setup();
    renderEditManualOptions({
      componentProps: {
        options: [
          { label: 'option1', value: 'option1' },
          { label: 'option2', value: 'option2' },
        ],
      },
    });

    const selectOptionButton = screen.getByRole('button', {
      name: textMock('ux_editor.radios_option', { optionNumber: 2 }),
    });
    await user.click(selectOptionButton);
    const removeOptionButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(removeOptionButton);
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      options: [{ label: 'option1', value: 'option1' }],
    });
  });

  it('should handle adding new option even if options property has not been set', async () => {
    renderEditManualOptions({
      componentProps: {
        options: undefined,
      },
    });

    const addOptionButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_new_option'),
    });
    addOptionButton.click();
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      options: [{ label: expect.any(String), value: expect.any(String) }],
    });
  });

  it('should delete optionsId property if it exists when adding a new option', async () => {
    renderEditManualOptions({
      componentProps: {
        optionsId: 'testId',
      },
    });

    const addOptionButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_new_option'),
    });
    addOptionButton.click();
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      options: [{ label: expect.any(String), value: expect.any(String) }],
    });
  });

  it('should call handleComponentUpdate when changing an option', async () => {
    const user = userEvent.setup();
    renderEditManualOptions({
      componentProps: {
        options: [{ label: 'option1', value: 'option1' }],
      },
    });

    const selectOptionButton = screen.getByRole('button', {
      name: textMock('ux_editor.radios_option', { optionNumber: 1 }),
    });
    await user.click(selectOptionButton);
    const textField = screen.getByRole('textbox', {
      name: textMock('general.value'),
    });
    await user.type(textField, 'a');
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      options: [{ label: 'option1', value: 'option1a' }],
    });
  });
});

function renderEditManualOptions<T extends ComponentType.Checkboxes | ComponentType.RadioButtons>({
  componentProps,
}: {
  componentProps?: Partial<FormItem<T>>;
  queries?: Partial<ServicesContextProps>;
} = {}) {
  const component = {
    ...mockComponent,
    ...componentProps,
  };
  renderWithProviders(
    <ManualTab handleComponentChange={handleComponentChange} component={component} />,
  );
}

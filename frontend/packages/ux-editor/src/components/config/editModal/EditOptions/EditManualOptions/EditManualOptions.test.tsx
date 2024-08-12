import React from 'react';
import { screen } from '@testing-library/react';

import { EditManualOptions } from './EditManualOptions';
import { renderWithProviders } from '../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../../../types/FormItem';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { FormComponent } from '../../../../../types/FormComponent';

const mockComponent: FormComponent<ComponentType.RadioButtons> = {
  id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
  type: ComponentType.RadioButtons,
  textResourceBindings: {
    title: 'ServiceName',
  },
  maxLength: 10,
  itemType: 'COMPONENT',
  dataModelBindings: { simpleBinding: '' },
};

const renderEditManualOptions = async <
  T extends ComponentType.Checkboxes | ComponentType.RadioButtons,
>({
  componentProps,
  handleComponentChange = jest.fn(),
}: {
  componentProps?: Partial<FormItem<T>>;
  handleComponentChange?: () => void;
  queries?: Partial<ServicesContextProps>;
} = {}) => {
  const component = {
    ...mockComponent,
    ...componentProps,
  };
  renderWithProviders(
    <EditManualOptions handleComponentChange={handleComponentChange} component={component} />,
  );
};

describe('EditManualOptions', () => {
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
    const handleComponentChangeMock = jest.fn();
    renderEditManualOptions({
      handleComponentChange: handleComponentChangeMock,
      componentProps: {
        options: [{ label: 'oldOption', value: 'oldOption' }],
      },
    });

    const addOptionButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_new_option'),
    });
    addOptionButton.click();
    expect(handleComponentChangeMock).toHaveBeenCalledWith({
      ...mockComponent,
      options: [
        { label: 'oldOption', value: 'oldOption' },
        { label: expect.any(String), value: expect.any(String) },
      ],
    });
  });

  it('should handle adding new option even if options property has not been set', async () => {
    const handleComponentChangeMock = jest.fn();
    renderEditManualOptions({
      handleComponentChange: handleComponentChangeMock,
      componentProps: {
        options: undefined,
      },
    });

    const addOptionButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_new_option'),
    });
    addOptionButton.click();
    expect(handleComponentChangeMock).toHaveBeenCalledWith({
      ...mockComponent,
      options: [{ label: expect.any(String), value: expect.any(String) }],
    });
  });

  it('should delete optionsId property if it exists when adding a new option', async () => {
    const handleComponentChangeMock = jest.fn();
    renderEditManualOptions({
      handleComponentChange: handleComponentChangeMock,
      componentProps: {
        optionsId: 'testId',
      },
    });

    const addOptionButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_new_option'),
    });
    addOptionButton.click();
    expect(handleComponentChangeMock).toHaveBeenCalledWith({
      ...mockComponent,
      options: [{ label: expect.any(String), value: expect.any(String) }],
    });
  });
});

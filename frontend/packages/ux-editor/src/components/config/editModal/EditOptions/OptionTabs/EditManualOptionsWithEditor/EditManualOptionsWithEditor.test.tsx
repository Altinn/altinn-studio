import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { EditManualOptionsWithEditor } from './EditManualOptionsWithEditor';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../../../../types/FormItem';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { FormComponent } from '../../../../../../types/FormComponent';
import userEvent from '@testing-library/user-event';

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

const renderEditManualOptionsWithEditor = <
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
    <EditManualOptionsWithEditor
      handleComponentChange={handleComponentChange}
      component={component}
    />,
  );
};

describe('EditManualOptionsWithEditor', () => {
  it('should display a button when no code list is defined in the layout', () => {
    renderEditManualOptionsWithEditor();

    const modalButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_code_list_custom_list'),
    });

    expect(modalButton).toBeInTheDocument();
  });

  it('should display a button when a code list is defined in the layout', () => {
    renderEditManualOptionsWithEditor({
      componentProps: {
        options: [{ label: 'option1', value: 'option1' }],
      },
    });

    const modalButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_code_list_custom_list'),
    });

    expect(modalButton).toBeInTheDocument();
  });

  it('should not display how many options have been defined, when no options are defined', () => {
    renderEditManualOptionsWithEditor();

    const optionText = screen.queryByText(textMock('ux_editor.options.single', { value: 1 }));
    const optionsText = screen.queryByText(textMock('ux_editor.options.multiple', { value: 2 }));

    expect(optionText).not.toBeInTheDocument();
    expect(optionsText).not.toBeInTheDocument();
  });

  it('should display how many options have been defined, when a single option is defined', () => {
    renderEditManualOptionsWithEditor({
      componentProps: {
        options: [{ label: 'option1', value: 'option1' }],
      },
    });

    const optionText = screen.getByText(textMock('ux_editor.options.single', { value: 1 }));
    const optionsText = screen.queryByText(textMock('ux_editor.options.multiple', { value: 2 }));

    expect(optionText).toBeInTheDocument();
    expect(optionsText).not.toBeInTheDocument();
  });

  it('should display how many options have been defined, when multiple options are defined', () => {
    renderEditManualOptionsWithEditor({
      componentProps: {
        options: [
          { label: 'option1', value: 'option1' },
          { label: 'option2', value: 'option2' },
        ],
      },
    });

    const optionText = screen.queryByText(textMock('ux_editor.options.single', { value: 1 }));
    const optionsText = screen.getByText(textMock('ux_editor.options.multiple', { value: 2 }));

    expect(optionText).not.toBeInTheDocument();
    expect(optionsText).toBeInTheDocument();
  });

  it('should open a modal when the trigger button is clicked', async () => {
    const user = userEvent.setup();
    renderEditManualOptionsWithEditor();

    const modalButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_code_list_custom_list'),
    });

    await user.click(modalButton);

    const modalDialog = screen.getByRole('dialog');

    expect(modalDialog).toBeInTheDocument();
  });

  it('should call handleComponentChange when there has been a change in the editor', async () => {
    const mockHandleComponentChange = jest.fn();
    const user = userEvent.setup();
    renderEditManualOptionsWithEditor({ handleComponentChange: mockHandleComponentChange });

    const modalButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_code_list_custom_list'),
    });

    await user.click(modalButton);

    const addNewButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_new_option'),
    });

    await user.click(addNewButton);
    await user.click(addNewButton);

    await waitFor(() => {
      expect(mockHandleComponentChange).toHaveBeenCalledWith({
        ...mockComponent,
        options: [
          { label: '', value: '' },
          { label: '', value: '' },
        ],
      });
    });
  });

  it('should delete optionsId from the layout when using the manual editor', async () => {
    const user = userEvent.setup();
    const mockHandleComponentChange = jest.fn();
    renderEditManualOptionsWithEditor({
      componentProps: {
        optionsId: 'somePredefinedOptionsList',
      },
      handleComponentChange: mockHandleComponentChange,
    });

    const modalButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_code_list_custom_list'),
    });

    await user.click(modalButton);

    const addNewButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_new_option'),
    });

    await user.click(addNewButton);

    await waitFor(() => {
      expect(mockHandleComponentChange).toHaveBeenCalledWith({
        ...mockComponent, // does not contain optionsId
        options: [{ label: '', value: '' }],
      });
    });
  });
});

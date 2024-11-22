import React from 'react';
import { screen } from '@testing-library/react';
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

describe('EditManualOptionsWithEditor', () => {
  it('should display a button when no code list is defined in the layout', () => {
    renderEditManualOptionsWithEditor();

    expect(
      screen.getByRole('button', {
        name: textMock('general.create_new'),
      }),
    ).toBeInTheDocument();
  });

  it('should display a button when a code list is defined in the layout', () => {
    renderEditManualOptionsWithEditor({
      componentProps: {
        options: [{ label: 'option1', value: 'option1' }],
      },
    });

    expect(
      screen.getByRole('button', {
        name: textMock('general.create_new'),
      }),
    ).toBeInTheDocument();
  });

  it('should open a modal when the trigger button is clicked', async () => {
    renderEditManualOptionsWithEditor();

    await userFindAndClickOnOpenModalButton();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should call handleComponentChange when there has been a change in the editor', async () => {
    const mockHandleComponentChange = jest.fn();
    const user = userEvent.setup();
    renderEditManualOptionsWithEditor({ handleComponentChange: mockHandleComponentChange });

    await userFindAndClickOnOpenModalButton();

    const addNewButton = screen.getByRole('button', {
      name: textMock('code_list_editor.add_option'),
    });
    await user.click(addNewButton);

    expect(mockHandleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      options: [{ label: '', value: '' }],
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

    await userFindAndClickOnOpenModalButton();

    const addNewButton = screen.getByRole('button', {
      name: textMock('code_list_editor.add_option'),
    });

    await user.click(addNewButton);

    expect(mockHandleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      options: [{ label: '', value: '' }],
    });
  });

  it('should call setChosenOption when closing modal', async () => {
    const user = userEvent.setup();
    const mockSetChosenOption = jest.fn();
    renderEditManualOptionsWithEditor({ setChosenOption: mockSetChosenOption });
    await userFindAndClickOnOpenModalButton();

    const closeBtn = screen.getByRole('button', {
      name: 'close modal', // Todo: Replace 'close modal' with this.textMock('settings_modal.close_button_label') when https://github.com/digdir/designsystemet/issues/2195 is fixed
    });
    await user.click(closeBtn);

    expect(mockSetChosenOption).toHaveBeenCalledTimes(1);
  });
});

async function userFindAndClickOnOpenModalButton() {
  const user = userEvent.setup();
  const modalButton = screen.getByRole('button', {
    name: textMock('general.create_new'),
  });

  await user.click(modalButton);
}

type renderProps<T extends ComponentType.Checkboxes | ComponentType.RadioButtons> = {
  componentProps?: Partial<FormItem<T>>;
  handleComponentChange?: () => void;
  queries?: Partial<ServicesContextProps>;
  setChosenOption?: () => void;
};

function renderEditManualOptionsWithEditor<
  T extends ComponentType.Checkboxes | ComponentType.RadioButtons,
>({
  componentProps = {},
  handleComponentChange = jest.fn(),
  setChosenOption = jest.fn(),
}: renderProps<T> = {}) {
  const component = {
    ...mockComponent,
    ...componentProps,
  };
  renderWithProviders(
    <EditManualOptionsWithEditor
      setChosenOption={setChosenOption}
      handleComponentChange={handleComponentChange}
      component={component}
    />,
  );
}

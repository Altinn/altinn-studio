import React from 'react';
import { screen } from '@testing-library/react';
import { EditManualOptionsWithEditor } from './EditManualOptionsWithEditor';
import { renderWithProviders } from '../../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../../../../../types/FormItem';
import userEvent from '@testing-library/user-event';
import { componentMocks } from '../../../../../../../testing/componentMocks';

// Test data:
const mockComponent = componentMocks[ComponentType.Dropdown];
mockComponent.optionsId = undefined;

const handleComponentChange = jest.fn();

describe('EditManualOptionsWithEditor', () => {
  it('should display a button when no code list is defined in the layout', () => {
    renderEditManualOptionsWithEditor();

    expect(
      screen.getByRole('button', {
        name: textMock('general.create_new'),
      }),
    ).toBeInTheDocument();
  });

  it('should open a modal when the trigger button is clicked', async () => {
    const user = userEvent.setup();
    renderEditManualOptionsWithEditor();

    await user.click(getOpenModalButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should call handleComponentChange when there has been a change in the editor', async () => {
    const user = userEvent.setup();
    renderEditManualOptionsWithEditor();

    await user.click(getOpenModalButton());
    await user.click(getAddNewOptionButton());

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      options: [{ label: '', value: '' }],
    });
  });

  it('should delete optionsId from the layout when using the manual editor', async () => {
    const user = userEvent.setup();
    renderEditManualOptionsWithEditor({
      componentProps: {
        optionsId: 'somePredefinedOptionsList',
      },
    });

    await user.click(getOpenModalButton());
    await user.click(getAddNewOptionButton());

    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      options: [{ label: '', value: '' }],
    });
  });

  it('should call setChosenOption when closing modal', async () => {
    const user = userEvent.setup();
    const mockSetComponentHasOptionList = jest.fn();
    const componentOptions = [];
    renderEditManualOptionsWithEditor({
      setComponentHasOptionList: mockSetComponentHasOptionList,
      componentProps: { options: componentOptions },
    });

    await user.click(getOpenModalButton());

    const closeButton = screen.getByRole('button', {
      name: 'close modal', // Todo: Replace 'close modal' with textMock('settings_modal.close_button_label') when we upgrade to Designsystemet v1
    });
    await user.click(closeButton);

    expect(mockSetComponentHasOptionList).toHaveBeenCalledTimes(1);
    expect(mockSetComponentHasOptionList).toHaveBeenCalledWith(true);
  });
});

function getOpenModalButton() {
  return screen.getByRole('button', {
    name: textMock('general.create_new'),
  });
}

function getAddNewOptionButton() {
  return screen.getByRole('button', { name: textMock('code_list_editor.add_option') });
}

type renderProps<T extends ComponentType.Checkboxes | ComponentType.RadioButtons> = {
  componentProps?: Partial<FormItem<T>>;
  setComponentHasOptionList?: () => void;
};

function renderEditManualOptionsWithEditor<
  T extends ComponentType.Checkboxes | ComponentType.RadioButtons,
>({ componentProps = {}, setComponentHasOptionList = jest.fn() }: renderProps<T> = {}) {
  const component = {
    ...mockComponent,
    ...componentProps,
  };
  renderWithProviders(
    <EditManualOptionsWithEditor
      setComponentHasOptionList={setComponentHasOptionList}
      handleComponentChange={handleComponentChange}
      component={component}
    />,
  );
}

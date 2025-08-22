import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../testing/mocks';
import { EditName, type EditNameProps } from './EditName';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('EditName', () => {
  it('should render the name in reading mode', async () => {
    renderEditName({});

    expect(readModeButton()).toBeInTheDocument();
  });

  it('should start editing when clicking on the name', async () => {
    const user = userEvent.setup();
    renderEditName({});

    await user.click(readModeButton());

    expect(nameTextField()).toBeInTheDocument();
  });

  it('should call onChange when saving the name', async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();
    renderEditName({ onChange: onChangeMock });

    await user.click(readModeButton());
    await user.clear(nameTextField());
    await user.type(nameTextField(), 'new name');
    await user.click(saveButton());

    expect(onChangeMock).toHaveBeenCalledWith('new name');
    expect(readModeButton()).toBeInTheDocument();
  });

  it('should call onChange when clicking enter in the text field', async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();
    renderEditName({ onChange: onChangeMock });

    await user.click(readModeButton());
    await user.clear(nameTextField());
    await user.type(nameTextField(), 'new name{enter}');

    expect(onChangeMock).toHaveBeenCalledWith('new name');
    expect(readModeButton()).toBeInTheDocument();
  });

  it('should cancel editing when clicking escape in the text field', async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();
    renderEditName({ onChange: onChangeMock });

    await user.click(readModeButton());
    await user.clear(nameTextField());
    await user.type(nameTextField(), 'new name{escape}');

    expect(onChangeMock).not.toHaveBeenCalled();
    expect(readModeButton()).toBeInTheDocument();
  });

  it('should cancel editing and revert to original name', async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();
    const originalNameValue = 'testName123';
    renderEditName({ name: originalNameValue, onChange: onChangeMock });

    await user.click(readModeButton());
    await user.clear(nameTextField());
    await user.type(nameTextField(), 'new name');
    await user.click(cancelButton());

    expect(onChangeMock).not.toHaveBeenCalled();
    expect(readModeButton()).toBeInTheDocument();
    await user.click(readModeButton());
    expect(nameTextField()).toHaveValue(originalNameValue);
  });
});

const readModeButton = () =>
  screen.getByRole('button', { name: textMock('ux_editor.page_group.name') });
const nameTextField = () =>
  screen.getByRole('textbox', { name: textMock('ux_editor.page_group.name') });
const saveButton = () => screen.getByRole('button', { name: textMock('general.save') });
const cancelButton = () => screen.getByRole('button', { name: textMock('general.cancel') });

const renderEditName = (componentProps: Partial<EditNameProps>) => {
  return renderWithProviders(
    <EditName
      name='nameMock'
      label={textMock('ux_editor.page_group.name')}
      onChange={jest.fn()}
      {...componentProps}
    />,
  );
};

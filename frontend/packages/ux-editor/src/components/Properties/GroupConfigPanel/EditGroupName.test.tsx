import React from 'react';
import type { GroupModel } from 'app-shared/types/api/dto/PageModel';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../testing/mocks';
import { EditGroupName, type EditGroupNameProps } from './EditGroupName';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('EditGroupName', () => {
  it('should render the group name in reading mode', async () => {
    renderEditGroupName({});

    expect(readModeButton()).toBeInTheDocument();
  });

  it('should start editing when clicking on the group name', async () => {
    const user = userEvent.setup();
    renderEditGroupName({});

    await user.click(readModeButton());

    expect(nameTextField()).toBeInTheDocument();
  });

  it('should call onChange when saving the group name', async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();
    renderEditGroupName({ onChange: onChangeMock });

    await user.click(readModeButton());
    await user.clear(nameTextField());
    await user.type(nameTextField(), 'new name');
    await user.click(saveButton());

    expect(onChangeMock).toHaveBeenCalledWith('new name');
    expect(readModeButton()).toBeInTheDocument();
  });

  it('should cancel editing and revert to original group name', async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();
    renderEditGroupName({ onChange: onChangeMock });

    await user.click(readModeButton());
    await user.clear(nameTextField());
    await user.type(nameTextField(), 'new name');
    await user.click(cancelButton());

    expect(onChangeMock).not.toHaveBeenCalled();
    expect(readModeButton()).toBeInTheDocument();
    await user.click(readModeButton());
    expect(nameTextField()).toHaveValue(mockGroupName);
  });
});

const readModeButton = () =>
  screen.getByRole('button', { name: textMock('ux_editor.page_group.name') });
const nameTextField = () =>
  screen.getByRole('textbox', { name: textMock('ux_editor.page_group.name') });
const saveButton = () => screen.getByRole('button', { name: textMock('general.save') });
const cancelButton = () => screen.getByRole('button', { name: textMock('general.cancel') });

const mockGroupName = 'testgroup';

const renderEditGroupName = (componentProps: Partial<EditGroupNameProps>) => {
  const groupModelMock: GroupModel = {
    name: mockGroupName,
    order: [{ id: 'testlayout 1' }, { id: 'testlayout 2' }],
  };
  return renderWithProviders(
    <EditGroupName group={groupModelMock} onChange={jest.fn()} {...componentProps} />,
  );
};

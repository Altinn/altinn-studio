import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResourceNameAndId, ResourceNameAndIdProps } from './ResourceNameAndId';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';

const mockResourceTitleInitial: string ='resource 123';
const mockResourceIdInitial: string ='resource-123';

const mockResourceTitleAfterChange: string = 'resource 1234';
const mockResourceIdAfterChange: string ='resource-1230';

describe('ResourceNameAndId', () => {
  const mockHandleEditTitle = jest.fn();
  const mockHandleIdInput = jest.fn();
  const mockHandleClickEditButton = jest.fn();

  const defaultProps: ResourceNameAndIdProps = {
    isEditOpen: false,
    title: mockResourceTitleInitial,
    text: 'Some text to be displayed in the component',
    id: mockResourceIdInitial,
    handleEditTitle: mockHandleEditTitle,
    handleIdInput: mockHandleIdInput,
    handleClickEditButton: mockHandleClickEditButton,
    resourceIdExists: false,
    bothFieldsHaveSameValue: false,
  };

  it('calls handleEditTitle function when a value is typed in the input field', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} />);

    const titleInput = screen.getByLabelText(textMock('resourceadm.dashboard_resource_name_and_id_resource_name'));
    expect(titleInput).toHaveValue(mockResourceTitleInitial);

    await act(() => user.type(titleInput, '4'));
    expect(mockHandleEditTitle).toHaveBeenCalledWith(mockResourceTitleAfterChange);
  });

  it('displays the edit button when isEditOpen is false, and hides the two icon buttons', () => {
    render(<ResourceNameAndId {...defaultProps} />);

    const editButton = screen.getByRole('button', { name: textMock('general.edit') });
    expect(editButton).toBeInTheDocument();

    const iconButtonCancel = screen.queryByRole('button', { name: textMock('resourceadm.dashboard_resource_name_and_id_delete_icon') });
    expect(iconButtonCancel).not.toBeInTheDocument();

    const iconButtonSave = screen.queryByRole('button', { name: textMock('resourceadm.dashboard_resource_name_and_id_checkmark_icon') });
    expect(iconButtonSave).not.toBeInTheDocument();
  })

  it('displays the two icon buttons for save and cancel when isEditOpen is true, and hides the edit button', () => {
    render(<ResourceNameAndId {...defaultProps} isEditOpen />);

    const iconButtonCancel = screen.getByRole('button', { name: textMock('resourceadm.dashboard_resource_name_and_id_delete_icon') });
    expect(iconButtonCancel).toBeInTheDocument();

    const iconButtonSave = screen.getByRole('button', { name: textMock('resourceadm.dashboard_resource_name_and_id_checkmark_icon') });
    expect(iconButtonSave).toBeInTheDocument();

    const editButton = screen.queryByRole('button', { name: textMock('general.edit') });
    expect(editButton).not.toBeInTheDocument();
  })

  it('calls handleIdInput function when a value is typed in the input field', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} isEditOpen />);

    const titleInput = screen.getByLabelText(textMock('resourceadm.dashboard_resource_name_and_id_resource_id'));
    expect(titleInput).toHaveValue(mockResourceIdInitial);

    await act(() => user.type(titleInput, '0'));
    expect(mockHandleIdInput).toHaveBeenCalledWith(mockResourceIdAfterChange);
  });

  it('calls handleClickEditButton when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} />);
    const editButton = screen.getByRole('button', { name: textMock('general.edit') });

    await act(() => user.click(editButton));
    expect(mockHandleClickEditButton).toHaveBeenCalledWith(false);
  });

  it('displays error message when resourceIdExists is true', () => {
    render(<ResourceNameAndId {...defaultProps} resourceIdExists />);
    const errorMessage = screen.getByText(textMock('resourceadm.dashboard_resource_name_and_id_error'));
    expect(errorMessage).toBeInTheDocument();
  });
});

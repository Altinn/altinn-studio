import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ResourceNameAndId, ResourceNameAndIdProps } from './ResourceNameAndId';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';

const mockTitleLabel = 'TitleLabel';
const mockIdLabel = 'IdLabel';
const mockResourceTitleInitial: string = 'resource 123';
const mockResourceIdInitial: string = 'resource-123';

const mockResourceTitleAfterChange: string = 'resource 1234';
const mockResourceIdAfterChange: string = 'resource-1230';

describe('ResourceNameAndId', () => {
  const mockHandleEditTitle = jest.fn();
  const mockHandleIdInput = jest.fn();

  const defaultProps: ResourceNameAndIdProps = {
    titleLabel: mockTitleLabel,
    idLabel: mockIdLabel,
    title: mockResourceTitleInitial,
    id: mockResourceIdInitial,
    onTitleChange: mockHandleEditTitle,
    onIdChange: mockHandleIdInput,
    conflictErrorMessage: '',
  };

  it('calls handleEditTitle function when a value is typed in the input field', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} />);

    const titleInput = screen.getByLabelText(mockTitleLabel);
    expect(titleInput).toHaveValue(mockResourceTitleInitial);

    await act(() => user.type(titleInput, '4'));
    expect(mockHandleEditTitle).toHaveBeenCalledWith(mockResourceTitleAfterChange);
  });

  it('displays the edit button when isEditOpen is false, and hides the two icon buttons', () => {
    render(<ResourceNameAndId {...defaultProps} />);

    const editButton = screen.getByRole('button', { name: textMock('general.edit') });
    expect(editButton).toBeInTheDocument();

    const iconButtonCancel = screen.queryByRole('button', {
      name: textMock('resourceadm.dashboard_resource_name_and_id_delete_icon'),
    });
    expect(iconButtonCancel).not.toBeInTheDocument();

    const iconButtonSave = screen.queryByRole('button', {
      name: textMock('resourceadm.dashboard_resource_name_and_id_checkmark_icon'),
    });
    expect(iconButtonSave).not.toBeInTheDocument();
  });

  it('displays the two icon buttons for save and cancel when id edit is enabled, and hides the edit button', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} />);

    const editButton = screen.queryByRole('button', { name: textMock('general.edit') });
    await act(() => user.click(editButton));

    const iconButtonCancel = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_resource_name_and_id_delete_icon'),
    });
    expect(iconButtonCancel).toBeInTheDocument();

    const iconButtonSave = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_resource_name_and_id_checkmark_icon'),
    });
    expect(iconButtonSave).toBeInTheDocument();

    expect(editButton).not.toBeInTheDocument();
  });

  it('calls handleIdInput function when a value is typed in the input field', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} />);

    const editButton = screen.queryByRole('button', { name: textMock('general.edit') });
    await act(() => user.click(editButton));

    const idInput = screen.getByLabelText(mockIdLabel);
    expect(idInput).toHaveValue(mockResourceIdInitial);

    await act(() => user.type(idInput, '0'));
    expect(mockHandleIdInput).toHaveBeenCalledWith(mockResourceIdAfterChange);
  });

  it('should revert id to title after cancel button is pressed', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} />);

    const editButton = screen.queryByRole('button', { name: textMock('general.edit') });
    await act(() => user.click(editButton));

    const idInput = screen.getByLabelText(mockIdLabel);

    await act(() => user.type(idInput, 'newId'));
    const iconButtonCancel = screen.getByRole('button', {
      name: textMock('resourceadm.dashboard_resource_name_and_id_delete_icon'),
    });
    await act(() => user.click(iconButtonCancel));

    expect(screen.getByText(mockResourceIdInitial)).toBeInTheDocument();
  });

  it('displays error message when conflictErrorMessage is set', async () => {
    render(<ResourceNameAndId {...defaultProps} conflictErrorMessage={'conflict!'} />);
    const errorMessageEl = screen.getByText('conflict!');
    await waitFor(() => expect(errorMessageEl).toBeInTheDocument());
  });
});

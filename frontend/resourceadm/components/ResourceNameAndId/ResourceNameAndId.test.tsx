import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ResourceNameAndIdProps } from './ResourceNameAndId';
import { ResourceNameAndId } from './ResourceNameAndId';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockTitleLabel = 'TitleLabel';
const mockIdLabel = 'IdLabel';
const mockResourceTitleInitial: string = 'resource 123';
const mockResourceIdInitial: string = 'resource-123';

const mockResourceTitleAfterChange: string = 'resource 1234';
const mockResourceIdAfterChange: string = 'resource-1230';

const editLabelButtonText = textMock('resourceadm.dashboard_resource_name_and_id_change', {
  objectType: mockIdLabel,
});
const saveEditButtonText = textMock('resourceadm.dashboard_resource_name_and_id_checkmark_icon', {
  objectType: mockIdLabel,
});
const cancelEditButtonText = textMock('resourceadm.dashboard_resource_name_and_id_delete_icon', {
  objectType: mockIdLabel,
});

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

    await user.type(titleInput, '4');
    expect(mockHandleEditTitle).toHaveBeenCalledWith(mockResourceTitleAfterChange);
  });

  it('displays the edit button when isEditOpen is false, and hides the two icon buttons', () => {
    render(<ResourceNameAndId {...defaultProps} />);

    const editButton = screen.getByRole('button', { name: editLabelButtonText });
    expect(editButton).toBeInTheDocument();

    const iconButtonCancel = screen.queryByRole('button', {
      name: cancelEditButtonText,
    });
    expect(iconButtonCancel).not.toBeInTheDocument();

    const iconButtonSave = screen.queryByRole('button', {
      name: saveEditButtonText,
    });
    expect(iconButtonSave).not.toBeInTheDocument();
  });

  it('displays the two icon buttons for save and cancel when id edit is enabled, and hides the edit button', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} />);

    const editButton = screen.queryByRole('button', { name: editLabelButtonText });
    await user.click(editButton);

    const iconButtonCancel = screen.getByRole('button', {
      name: cancelEditButtonText,
    });
    expect(iconButtonCancel).toBeInTheDocument();

    const iconButtonSave = screen.getByRole('button', {
      name: saveEditButtonText,
    });
    expect(iconButtonSave).toBeInTheDocument();

    expect(editButton).not.toBeInTheDocument();
  });

  it('calls handleIdInput function when a value is typed in the input field', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} />);

    const editButton = screen.queryByRole('button', { name: editLabelButtonText });
    await user.click(editButton);

    const idInput = screen.getByLabelText(mockIdLabel);
    expect(idInput).toHaveValue(mockResourceIdInitial);

    await user.type(idInput, '0');
    expect(mockHandleIdInput).toHaveBeenCalledWith(mockResourceIdAfterChange);
  });

  it('should revert id to title after cancel button is pressed', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} />);

    const editButton = screen.queryByRole('button', { name: editLabelButtonText });
    await user.click(editButton);

    const idInput = screen.getByLabelText(mockIdLabel);

    await user.type(idInput, 'newId');
    const iconButtonCancel = screen.getByRole('button', {
      name: cancelEditButtonText,
    });
    await user.click(iconButtonCancel);

    expect(screen.getByText(mockResourceIdInitial)).toBeInTheDocument();
  });

  it('should disable edit of id field after checkmark button is pressed', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} />);

    const editButton = screen.queryByRole('button', { name: editLabelButtonText });
    await user.click(editButton);

    const idInput = screen.getByLabelText(mockIdLabel);

    await user.type(idInput, 'newId');

    const iconButtonSave = screen.queryByRole('button', {
      name: saveEditButtonText,
    });

    await user.click(iconButtonSave);
    expect(idInput).not.toBeInTheDocument();
  });

  it('displays error message when conflictErrorMessage is set', () => {
    render(<ResourceNameAndId {...defaultProps} conflictErrorMessage={'conflict!'} />);
    const errorMessageEl = screen.getByText('conflict!');
    expect(errorMessageEl).toBeInTheDocument();
  });

  it('should replace illegal characters in id with hyphens', async () => {
    const user = userEvent.setup();
    render(<ResourceNameAndId {...defaultProps} title='test/\\?: #=name' />);

    const titleInput = screen.getByLabelText(mockTitleLabel);
    await user.type(titleInput, '1');

    expect(mockHandleIdInput).toHaveBeenCalledWith('test-name1');
  });
});

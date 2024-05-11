import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PolicyResourceFieldsProps } from './PolicyResourceFields';
import { PolicyResourceFields } from './PolicyResourceFields';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

const mockValueId: string = 'Test123';
const mockValueType: string = '123Test';
const mockValudNewText = '45';

describe('PolicyResourceFields', () => {
  afterEach(jest.clearAllMocks);

  const mockOnRemove = jest.fn();
  const mockOnChangeId = jest.fn();
  const mockOnChangeType = jest.fn();
  const mockOnBlur = jest.fn();

  const defaultProps: PolicyResourceFieldsProps = {
    canEditTypeAndId: true,
    onRemove: mockOnRemove,
    valueId: mockValueId,
    onChangeId: mockOnChangeId,
    valueType: mockValueType,
    onChangeType: mockOnChangeType,
    onBlur: mockOnBlur,
  };

  it('sets text fields to readonly when "canEditTypeAndId" is false', () => {
    render(<PolicyResourceFields {...defaultProps} canEditTypeAndId={false} />);

    const idInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_id'));
    expect(idInput).toHaveAttribute('readonly');

    const typeInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_type'));
    expect(typeInput).toHaveAttribute('readonly');
  });

  it('sets text fields to not be readonly when "canEditTypeAndId" is true', () => {
    render(<PolicyResourceFields {...defaultProps} />);

    const idInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_id'));
    expect(idInput).not.toHaveAttribute('readonly');

    const typeInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_type'));
    expect(typeInput).not.toHaveAttribute('readonly');
  });

  it('calls "onChangeId" when id input values change', async () => {
    const user = userEvent.setup();
    render(<PolicyResourceFields {...defaultProps} />);

    const idInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_id'));

    user.type(idInput, mockValudNewText);

    await waitFor(() => expect(mockOnChangeId).toHaveBeenCalledTimes(mockValudNewText.length));
  });

  it('calls "onChangeType" when type input values change', async () => {
    const user = userEvent.setup();
    render(<PolicyResourceFields {...defaultProps} />);

    const typeInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_type'));

    user.type(typeInput, mockValudNewText);

    await waitFor(() => expect(mockOnChangeType).toHaveBeenCalledTimes(mockValudNewText.length));
  });

  it('calls "onBlur" when input fields lose focus', async () => {
    const user = userEvent.setup();
    render(<PolicyResourceFields {...defaultProps} />);

    const typeInput = screen.getByLabelText(textMock('policy_editor.narrowing_list_field_type'));

    await waitFor(() => user.type(typeInput, mockValudNewText));
    user.tab();
    await waitFor(() => expect(mockOnBlur).toHaveBeenCalledTimes(1));
  });

  it('hides the delete button when "canEditTypeAndId" is false', () => {
    render(<PolicyResourceFields {...defaultProps} canEditTypeAndId={false} />);

    const deleteButton = screen.queryByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });

    expect(deleteButton).not.toBeInTheDocument();
  });

  it('calls "onRemove" when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<PolicyResourceFields {...defaultProps} />);

    const deleteButton = screen.getByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });

    expect(deleteButton).toBeInTheDocument();

    user.click(deleteButton);

    await waitFor(() => expect(mockOnRemove).toHaveBeenCalledTimes(1));
  });
});

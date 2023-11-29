import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CanvasActionMenu, CanvasActionMenuProps } from './CanvasActionMenu';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

const mockOnSave = jest.fn();
const mockToggleViewModus = jest.fn();

const defaultProps: CanvasActionMenuProps = {
  isEditorView: false,
  onSave: mockOnSave,
  toggleViewModus: mockToggleViewModus,
};

describe('CanvasActionMenu', () => {
  afterEach(jest.clearAllMocks);

  it('hides the save button when the user is not in editor view', async () => {
    const user = userEvent.setup();
    render(<CanvasActionMenu {...defaultProps} />);

    // Fix to remove act error
    await act(() => user.tab());

    const editButton = screen.queryByRole('button', { name: textMock('process_editor.save') });
    expect(editButton).not.toBeInTheDocument();
  });

  it('calls "onSave" when the user is in edit more and clicks save button', async () => {
    const user = userEvent.setup();
    render(<CanvasActionMenu {...defaultProps} isEditorView />);

    const editButton = screen.getByRole('button', { name: textMock('process_editor.save') });
    await act(() => user.click(editButton));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('calls "toggleViewModus" when the user clicks toggle button', async () => {
    const user = userEvent.setup();
    render(<CanvasActionMenu {...defaultProps} />);

    const toggleButtonView = screen.queryByRole('button', {
      name: textMock('process_editor.view_mode'),
    });
    const toggleButtonEdit = screen.getByRole('button', {
      name: textMock('process_editor.edit_mode'),
    });

    expect(toggleButtonView).not.toBeInTheDocument();
    expect(toggleButtonEdit).toBeInTheDocument();

    await act(() => user.click(toggleButtonEdit));
    expect(mockToggleViewModus).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CanvasActionMenu, CanvasActionMenuProps } from './CanvasActionMenu';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

const mockOnSave = jest.fn();

const defaultProps: CanvasActionMenuProps = {
  onSave: mockOnSave,
};

describe('CanvasActionMenu', () => {
  afterEach(jest.clearAllMocks);

  it('Should show save button', () => {
    render(<CanvasActionMenu {...defaultProps} />);
    const saveButton = screen.getByRole('button', { name: textMock('process_editor.save') });
    expect(saveButton).toBeInTheDocument();
  });

  it('calls "onSave" when the user clicks save button', async () => {
    const user = userEvent.setup();
    render(<CanvasActionMenu {...defaultProps} />);
    const editButton = screen.getByRole('button', { name: textMock('process_editor.save') });
    await act(() => user.click(editButton));
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });
});

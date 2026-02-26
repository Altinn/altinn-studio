import React from 'react';
import { render, type RenderResult, screen } from '@testing-library/react';
import { StudioConfigCardFooter, type StudioConfigCardFooterProps } from './StudioConfigCardFooter';
import userEvent from '@testing-library/user-event';

describe('StudioConfigCardFooter', () => {
  it('should render save and cancel buttons with correct labels', () => {
    renderStudioConfigCardFooter();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should call save when clicking on save button', async () => {
    const user = userEvent.setup();
    const onSaveMock = jest.fn();
    renderStudioConfigCardFooter({ onSave: onSaveMock });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);
    expect(onSaveMock).toHaveBeenCalled();
  });

  it('should call cancel when clicking on cancel button', async () => {
    const user = userEvent.setup();
    const onCancelMock = jest.fn();
    renderStudioConfigCardFooter({ onCancel: onCancelMock });

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);
    expect(onCancelMock).toHaveBeenCalled();
  });
});

const renderStudioConfigCardFooter = (
  props: Partial<StudioConfigCardFooterProps> = {},
): RenderResult => {
  const defaultProps: StudioConfigCardFooterProps = {
    saveLabel: 'Save',
    cancelLabel: 'Cancel',
    onSave: jest.fn(),
    onCancel: jest.fn(),
    isDisabled: false,
    isLoading: false,
  };
  return render(<StudioConfigCardFooter {...defaultProps} {...props} />);
};

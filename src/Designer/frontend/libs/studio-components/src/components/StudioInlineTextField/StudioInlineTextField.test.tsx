import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioInlineTextField } from './StudioInlineTextField';
import type { StudioInlineTextFieldProps } from './StudioInlineTextField';

const label = 'My field';
const value = 'Initial value';

describe('StudioInlineTextField', () => {
  it('Renders the view mode by default', () => {
    renderStudioInlineTextField({ label, value });
    const viewButton = screen.getByRole('button', { name: label });
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toHaveTextContent(value);
  });

  it('Renders view mode with empty value', () => {
    renderStudioInlineTextField({ label, value: '' });
    const viewButton = screen.getByRole('button', { name: label });
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toHaveTextContent(label);
  });

  it('should call onChange and close edit mode when Save is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderStudioInlineTextField({
      label,
      value,
      onChange,
      saveAriaLabel: 'Save',
      cancelAriaLabel: 'Cancel',
    });
    await user.click(screen.getByRole('button', { name: label }));
    const newValue = 'Updated value';
    await user.clear(screen.getByRole('textbox', { name: label }));
    await user.type(screen.getByRole('textbox', { name: label }), newValue);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onChange).toHaveBeenCalledWith(newValue);
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: label })).not.toBeInTheDocument();
  });

  it('should render description in edit mode when provided', async () => {
    const user = userEvent.setup();
    const description = 'Help text for the field';
    renderStudioInlineTextField({ label, value, description });
    await user.click(screen.getByRole('button', { name: label }));
    expect(screen.getByText(description)).toBeInTheDocument();
  });
});

const defaultProps: StudioInlineTextFieldProps = {
  label,
  value,
  onChange: () => {},
  saveAriaLabel: '',
  cancelAriaLabel: '',
};

const renderStudioInlineTextField = (
  props: Partial<StudioInlineTextFieldProps> = {},
): RenderResult => {
  return render(<StudioInlineTextField {...defaultProps} {...props} />);
};

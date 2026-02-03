import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioInlineEdit } from './StudioInlineEdit';
import type { StudioInlineEditProps } from './StudioInlineEdit';

const label = 'My field';
const value = 'Initial value';

describe('StudioInlineEdit', () => {
  it('Renders the view mode by default', () => {
    renderStudioInlineEdit({ label, value });
    const viewButton = screen.getByRole('button', { name: label });
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toHaveTextContent(value);
  });

  it('Renders view mode with empty value', () => {
    renderStudioInlineEdit({ label, value: '' });
    const viewButton = screen.getByRole('button', { name: label });
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toHaveTextContent(label);
  });

  it('should call onChange and close edit mode when Save is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderStudioInlineEdit({
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
    renderStudioInlineEdit({ label, value, description });
    await user.click(screen.getByRole('button', { name: label }));
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('should render custom icon in view mode when value is empty', () => {
    const icon = <span data-testid='custom-icon' />;
    renderStudioInlineEdit({ label, value: '', icon });
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('should not render custom icon in view mode when value is set', () => {
    const icon = <span data-testid='custom-icon' />;
    renderStudioInlineEdit({ label, value, icon });
    expect(screen.queryByTestId('custom-icon')).not.toBeInTheDocument();
  });
});

const defaultProps: StudioInlineEditProps = {
  label,
  value,
};

const renderStudioInlineEdit = (props: Partial<StudioInlineEditProps> = {}): RenderResult => {
  return render(<StudioInlineEdit {...defaultProps} {...props} />);
};

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  StudioToggleableTextfield,
  type StudioToggleableTextfieldProps,
} from './StudioToggleableTextfield';

import userEvent from '@testing-library/user-event';

const value: string = 'value';
const label: string = 'label';
const customValidation = jest.fn();
const onBlur = jest.fn();
const onChange = jest.fn();

describe('StudioToggleableTextfield', () => {
  afterEach(jest.clearAllMocks);

  it('Renders the view mode by default', () => {
    renderStudioTextField();
    expect(screen.getByRole('button', { name: value })).toBeInTheDocument();
  });

  it('should toggle to edit-mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioTextField();
    await user.click(screen.getByRole('button', { name: value }));
    expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument();
  });

  it('should run custom validation when value changes', async () => {
    const user = userEvent.setup();
    renderStudioTextField({ customValidation });
    await user.click(screen.getByRole('button', { name: value }));
    const typedInputValue = 'John';
    await user.type(screen.getByRole('textbox', { name: label }), typedInputValue);
    expect(customValidation).toHaveBeenCalledTimes(typedInputValue.length);
  });

  it('should toggle back to view mode on blur', async () => {
    const user = userEvent.setup();
    renderStudioTextField();
    const viewButton = screen.getByRole('button', { name: value });
    await user.click(viewButton);
    const editTextfield = screen.getByRole('textbox', { name: label });
    expect(editTextfield).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('button', { name: value })).toBeInTheDocument();
  });

  it('should execute onBlur method when input is blurred', async () => {
    const user = userEvent.setup();
    renderStudioTextField();
    await user.click(screen.getByRole('button', { name: value }));
    await user.tab();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('should not toggle view on blur when input field has error', async () => {
    const user = userEvent.setup();
    const error = 'Your name is a required field';
    renderStudioTextField({ error });
    await user.click(screen.getByRole('button', { name: value }));
    await user.tab();
    expect(screen.getByRole('textbox', { name: label })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: value })).not.toBeInTheDocument();
  });

  it('should execute onChange method when input value changes', async () => {
    const user = userEvent.setup();
    renderStudioTextField();
    const inputValue = 'John';
    await user.click(screen.getByRole('button', { name: value }));
    await user.type(screen.getByRole('textbox', { name: label }), inputValue);
    expect(onChange).toHaveBeenCalledTimes(inputValue.length);
  });

  it('should render error message if customValidation occured', async () => {
    const user = userEvent.setup();
    const customError = 'Your name cannot include "test"';
    renderStudioTextField({
      customValidation: (valueToValidate: string) =>
        valueToValidate.includes('test') ? customError : undefined,
    });
    await user.click(screen.getByRole('button', { name: value }));
    await user.type(screen.getByRole('textbox', { name: label }), 'test');
    expect(screen.getByText(customError));
  });
});

const defaultProps: StudioToggleableTextfieldProps = {
  label,
  value,
  onBlur,
  onChange,
  customValidation,
};

const renderStudioTextField = (props: Partial<StudioToggleableTextfieldProps> = {}) => {
  return render(<StudioToggleableTextfield {...defaultProps} {...props} />);
};

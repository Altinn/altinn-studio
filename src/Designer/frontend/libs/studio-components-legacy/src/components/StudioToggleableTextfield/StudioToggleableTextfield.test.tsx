import React from 'react';
import type { RenderResult } from '@testing-library/react';
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
    renderStudioToggleableTextfield();
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: label })).toHaveTextContent(value);
  });

  it('should toggle to edit-mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioToggleableTextfield();
    await user.click(screen.getByRole('button', { name: label }));
    expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: label })).toHaveValue(value);
  });

  it('should run custom validation when value changes', async () => {
    const user = userEvent.setup();
    renderStudioToggleableTextfield({ customValidation });
    await user.click(screen.getByRole('button', { name: label }));
    const typedInputValue = 'John';
    await user.type(screen.getByRole('textbox', { name: label }), typedInputValue);
    expect(customValidation).toHaveBeenCalledTimes(typedInputValue.length);
  });

  it('should toggle back to view mode on blur', async () => {
    const user = userEvent.setup();
    renderStudioToggleableTextfield();
    const viewButton = screen.getByRole('button', { name: label });
    await user.click(viewButton);
    const editTextfield = screen.getByRole('textbox', { name: label });
    expect(editTextfield).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });

  it('should execute onBlur method when input is blurred', async () => {
    const user = userEvent.setup();
    renderStudioToggleableTextfield();
    await user.click(screen.getByRole('button', { name: label }));
    await user.tab();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('should not toggle view on blur when input field has error', async () => {
    const error = 'Your name is a required field';
    const user = userEvent.setup();
    renderStudioToggleableTextfield({ error });
    await user.click(screen.getByRole('button', { name: label }));
    await user.tab();
    expect(screen.getByRole('textbox', { name: label })).toBeInvalid();
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
  });

  it('should execute onChange method when input value changes', async () => {
    const user = userEvent.setup();
    renderStudioToggleableTextfield();
    const inputValue = 'John';
    await user.click(screen.getByRole('button', { name: label }));
    await user.type(screen.getByRole('textbox', { name: label }), inputValue);
    expect(onChange).toHaveBeenCalledTimes(inputValue.length);
  });

  it('should render error message if customValidation occured', async () => {
    const user = userEvent.setup();
    const customError = 'Your name cannot include "test"';
    renderStudioToggleableTextfield({
      customValidation: (valueToValidate: string) =>
        valueToValidate.includes('test') ? customError : undefined,
    });
    await user.click(screen.getByRole('button', { name: label }));
    await user.type(screen.getByRole('textbox', { name: label }), 'test');
    expect(screen.getByText(customError));
  });
});

const defaultProps: StudioToggleableTextfieldProps = {
  customValidation,
  label,
  onBlur,
  onChange,
  value,
};

const renderStudioToggleableTextfield = (
  props: Partial<StudioToggleableTextfieldProps> = {},
): RenderResult => {
  return render(<StudioToggleableTextfield {...defaultProps} {...props} />);
};

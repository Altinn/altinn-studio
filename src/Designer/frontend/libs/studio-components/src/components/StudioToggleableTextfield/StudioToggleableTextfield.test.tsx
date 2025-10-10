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
    await user.click(editTextfield);
    await user.click(document.body);
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });

  it('should not toggle view on blur when input field has error', async () => {
    const error = 'Your name is a required field';
    const user = userEvent.setup();
    renderStudioToggleableTextfield({ error });
    await user.click(screen.getByRole('button', { name: label }));
    const input = screen.getByRole('textbox', { name: label });
    await user.click(input);
    await user.click(document.body);
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
    const customError = 'Your name cannot include the letter "t"';
    const customValidationSpy = jest.fn((valueToValidate: string) =>
      valueToValidate.includes('t') ? customError : undefined,
    );
    renderStudioToggleableTextfield({ customValidation: customValidationSpy });
    await user.click(screen.getByRole('button', { name: label }));
    const input = screen.getByRole('textbox', { name: label });
    await user.type(input, 'test');
    expect(customValidationSpy).toHaveBeenCalled();
    const callsWithT = customValidationSpy.mock.calls.filter((call) => call[0].includes('t'));
    expect(callsWithT.length).toBeGreaterThan(0);
    expect(screen.getByText(customError)).toBeInTheDocument();
    expect(input).toBeInvalid();
    await user.click(document.body);
    expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
  });

  it('should render error message with simple validation', async () => {
    const user = userEvent.setup();
    const customError = 'Error message';
    renderStudioToggleableTextfield({
      customValidation: () => customError,
    });
    await user.click(screen.getByRole('button', { name: label }));
    const input = screen.getByRole('textbox', { name: label });
    await user.type(input, 'a');
    expect(screen.getByText(customError)).toBeInTheDocument();
    expect(input).toBeInvalid();
  });

  it('should call onIsViewMode callback when view mode changes', async () => {
    const user = userEvent.setup();
    const onIsViewModeSpy = jest.fn();
    renderStudioToggleableTextfield({ onIsViewMode: onIsViewModeSpy });
    expect(onIsViewModeSpy).toHaveBeenCalledWith(true);
    await user.click(screen.getByRole('button', { name: label }));
    expect(onIsViewModeSpy).toHaveBeenCalledWith(false);
  });

  it('should use defaultValue when value is not provided', () => {
    const defaultValue = 'default value';
    renderStudioToggleableTextfield({ value: undefined, defaultValue });
    expect(screen.getByRole('button', { name: label })).toHaveTextContent(defaultValue);
  });

  it('should handle custom icon prop', () => {
    const customIcon = <span data-testid='custom-icon'></span>;
    renderStudioToggleableTextfield({ icon: customIcon });
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('should handle title prop in view mode', () => {
    const title = 'Custom title';
    renderStudioToggleableTextfield({ title });
    const button = screen.getByRole('button', { name: label });
    expect(button).toHaveAttribute('title', title);
  });

  it('should handle onChange without custom validation', async () => {
    const user = userEvent.setup();
    const onChangeSpy = jest.fn();
    renderStudioToggleableTextfield({ customValidation: undefined, onChange: onChangeSpy });
    await user.click(screen.getByRole('button', { name: label }));
    const input = screen.getByRole('textbox', { name: label });
    await user.type(input, 'test');
    expect(onChangeSpy).toHaveBeenCalled();
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

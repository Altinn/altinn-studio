import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { StudioToggleableTextfield } from './StudioToggableTextfield';
import type { StudioToggleableTextfieldProps } from './StudioToggableTextfield';
import userEvent from '@testing-library/user-event';

describe('StudioToggleableTextfield', () => {
  it('Renders the view mode by default', () => {
    renderStudioTextField({
      viewProps: { children: 'Edit binding' },
    });
    expect(screen.getByRole('button', { name: 'Edit binding' })).toBeInTheDocument();
  });

  it('should toggle to edit-mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'Edit name' },
      inputProps: { value: '', icon: <div />, label: 'Your name' },
    });
    await act(() => user.click(screen.getByRole('button', { name: 'Edit name' })));
    expect(screen.getByLabelText('Your name')).toBeEnabled();
  });

  it('should run custom validation when value changes', async () => {
    const customValidation = jest.fn();
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'Edit name' },
      inputProps: { value: '', label: 'Your name', icon: <div /> },
      customValidation,
    });
    await act(() => user.click(screen.getByRole('button', { name: 'Edit name' })));

    const typedInputValue = 'John';
    await act(() => user.type(screen.getByLabelText('Your name'), typedInputValue));

    expect(customValidation).toHaveBeenCalledTimes(typedInputValue.length);
  });

  it('should be toggle back to view mode on blur', async () => {
    const user = userEvent.setup();

    renderStudioTextField({
      viewProps: { children: 'edit' },
      inputProps: { value: 'value', label: 'Your name', icon: <div /> },
    });

    await act(() => user.click(screen.getByRole('button', { name: 'edit' })));
    expect(screen.getByLabelText('Your name')).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();

    fireEvent.blur(screen.getByLabelText('Your name'));
    await screen.findByRole('button', { name: 'edit' });
  });

  it('should execute onBlur method when input is blurred', async () => {
    const onBlurMock = jest.fn();
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'Edit name' },
      inputProps: { onBlur: onBlurMock, label: 'Your name', icon: <div /> },
    });

    await act(() => user.click(screen.getByRole('button', { name: 'Edit name' })));
    fireEvent.blur(screen.getByLabelText('Your name'));
    expect(onBlurMock).toHaveBeenCalledTimes(1);
  });

  it('should not toggle view on blur when input field has error', async () => {
    const user = userEvent.setup();

    renderStudioTextField({
      viewProps: { children: 'Edit your name' },
      inputProps: { label: 'Your name', icon: <div />, error: 'Your name is a required field' },
    });

    await act(() => user.click(screen.getByRole('button', { name: 'Edit your name' })));

    const inputField = screen.getByLabelText('Your name');
    fireEvent.blur(inputField);

    expect(inputField).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Your name is a required field')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit your name' })).not.toBeInTheDocument();
  });

  it('should execute onChange method when input value changes', async () => {
    const onChangeMock = jest.fn();
    const user = userEvent.setup();

    renderStudioTextField({
      viewProps: { children: 'edit' },
      inputProps: { onChange: onChangeMock, label: 'Your name', icon: <div /> },
    });

    const inputValue = 'John';
    await act(() => user.click(screen.getByRole('button', { name: 'edit' })));
    await act(() => user.type(screen.getByLabelText('Your name'), inputValue));

    expect(onChangeMock).toHaveBeenCalledTimes(inputValue.length);
  });

  it('should render the help text button when toggle to edit mode', async () => {
    const user = userEvent.setup();

    renderStudioTextField({
      viewProps: { children: 'edit' },
    });

    await act(() => user.click(screen.getByRole('button', { name: 'edit' })));
    expect(screen.getByText('helpText'));
  });

  it('should render error message if customValidation occured', async () => {
    const user = userEvent.setup();

    renderStudioTextField({
      viewProps: { children: 'Edit name' },
      inputProps: { label: 'Your name', icon: <div /> },
      customValidation: (value: string) =>
        value === 'test' ? 'Your name cannot be "test"' : undefined,
    });

    await act(() => user.click(screen.getByRole('button', { name: 'Edit name' })));
    await act(() => user.type(screen.getByLabelText('Your name'), 'test'));
    expect(screen.getByText('Your name cannot be "test"'));
  });
});

const renderStudioTextField = (props: Partial<StudioToggleableTextfieldProps>) => {
  const defaultProps: StudioToggleableTextfieldProps = {
    inputProps: {
      value: 'value',
      icon: <div />,
    },
    viewProps: {
      children: 'edit',
    },
    customValidation: jest.fn(),
    helpText: 'helpText',
  };
  return render(<StudioToggleableTextfield {...defaultProps} {...props} />);
};

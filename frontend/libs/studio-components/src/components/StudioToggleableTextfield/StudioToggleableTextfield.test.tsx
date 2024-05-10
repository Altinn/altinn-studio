import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  StudioToggleableTextfield,
  type StudioToggleableTextfieldProps,
} from './StudioToggleableTextfield';

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
    user.click(screen.getByRole('button', { name: 'Edit name' }));
    await waitFor(() => expect(screen.getByLabelText('Your name')).toBeEnabled());
  });

  it('should run custom validation when value changes', async () => {
    const customValidation = jest.fn();
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'Edit name' },
      inputProps: { value: '', label: 'Your name', icon: <div /> },
      customValidation,
    });
    user.click(screen.getByRole('button', { name: 'Edit name' }));

    const typedInputValue = 'John';
    user.type(await screen.findByLabelText('Your name'), typedInputValue);

    await waitFor(() => expect(customValidation).toHaveBeenCalledTimes(typedInputValue.length));
  });

  it('should be toggle back to view mode on blur', async () => {
    const user = userEvent.setup();

    renderStudioTextField({
      viewProps: { children: 'edit' },
      inputProps: { value: 'value', label: 'Your name', icon: <div /> },
    });

    user.click(screen.getByRole('button', { name: 'edit' }));
    await waitFor(() => expect(screen.getByLabelText('Your name')).toBeEnabled());
    expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();

    fireEvent.blur(screen.getByLabelText('Your name'));
    const editButton = await screen.findByRole('button', { name: 'edit' });
    expect(editButton).toBeInTheDocument();
  });

  it('should execute onBlur method when input is blurred', async () => {
    const onBlurMock = jest.fn();
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'Edit name' },
      inputProps: { onBlur: onBlurMock, label: 'Your name', icon: <div /> },
    });

    user.click(screen.getByRole('button', { name: 'Edit name' }));

    fireEvent.blur(await screen.findByLabelText('Your name'));
    expect(onBlurMock).toHaveBeenCalledTimes(1);
  });

  it('should not toggle view on blur when input field has error', async () => {
    const user = userEvent.setup();

    renderStudioTextField({
      viewProps: { children: 'Edit your name' },
      inputProps: { label: 'Your name', icon: <div />, error: 'Your name is a required field' },
    });

    user.click(screen.getByRole('button', { name: 'Edit your name' }));

    const inputField = await screen.findByLabelText('Your name');
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
    user.click(screen.getByRole('button', { name: 'edit' }));
    user.type(await screen.findByLabelText('Your name'), inputValue);

    await waitFor(() => expect(onChangeMock).toHaveBeenCalledTimes(inputValue.length));
  });

  it('should render error message if customValidation occured', async () => {
    const user = userEvent.setup();

    renderStudioTextField({
      viewProps: { children: 'Edit name' },
      inputProps: { label: 'Your name', icon: <div /> },
      customValidation: (value: string) =>
        value === 'test' ? 'Your name cannot be "test"' : undefined,
    });

    user.click(screen.getByRole('button', { name: 'Edit name' }));
    await waitFor(() => user.type(screen.getByLabelText('Your name'), 'test'));
    expect(screen.getByText('Your name cannot be "test"')).toBeInTheDocument();
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
  };
  return render(<StudioToggleableTextfield {...defaultProps} {...props} />);
};

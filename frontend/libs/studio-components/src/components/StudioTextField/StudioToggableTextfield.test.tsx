import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { StudioToggableTextfield } from './StudioToggableTextfield';
import type { StudioToggableTextfieldProps } from './StudioToggableTextfield';
import userEvent from '@testing-library/user-event';

describe('StudioToggableTextfield', () => {
  it('Renders the view mode by default', () => {
    renderStudioTextField({});
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('Toggles to edit mode when clicked', async () => {
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'edit' },
      inputProps: { value: 'value', icon: <div /> },
    });
    await act(() => user.click(screen.getByRole('button', { name: 'edit' })));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('Calls customValidation when chnaging input', async () => {
    const customValidation = jest.fn();
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'edit' },
      inputProps: { value: 'value', icon: <div /> },
      customValidation,
    });
    await act(() => user.click(screen.getByRole('button', { name: 'edit' })));
    await act(() => user.type(screen.getByRole('textbox'), 'test'));

    expect(customValidation).toHaveBeenCalled();
  });

  it('Calls onBlur when leaving the input', async () => {
    const onBlur = jest.fn();
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'edit' },
      inputProps: { value: 'value', icon: <div />, onBlur },
    });
    await act(() => user.click(screen.getByRole('button', { name: 'edit' })));
    await act(() => user.click(document.body));

    expect(onBlur).toHaveBeenCalled();
  });

  it('Calls onChange when changing input', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'edit' },
      inputProps: { value: 'value', onChange, icon: <div /> },
    });
    await act(() => user.click(screen.getByRole('button', { name: 'edit' })));
    await act(() => user.type(screen.getByRole('textbox'), 'test'));

    expect(onChange).toHaveBeenCalled();
  });

  it('Renders the help text when toggle to edit mode', async () => {
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'edit' },
      inputProps: { value: 'value', icon: <div /> },
    });
    await act(() => user.click(screen.getByRole('button', { name: 'edit' })));
    const helpText = screen.getByText('helpText');
    expect(helpText).toBeInTheDocument();
  });

  it('Renders the error message when customValidation returns an error', async () => {
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'edit' },
      inputProps: { value: 'value', icon: <div /> },
      customValidation: () => 'error',
    });
    await act(() => user.click(screen.getByRole('button', { name: 'edit' })));
    await act(() => user.type(screen.getByRole('textbox'), 'test'));
    const error = screen.getByText('error');
    expect(error).toBeInTheDocument();
  });

  it('Renders the error message when inputProps.error is set', async () => {
    const user = userEvent.setup();
    renderStudioTextField({
      viewProps: { children: 'edit' },
      inputProps: { value: 'value', icon: <div />, error: 'error' },
    });
    await act(() => user.click(screen.getByRole('button', { name: 'edit' })));
    const error = screen.getByText('error');
    expect(error).toBeInTheDocument();
  });
});

const renderStudioTextField = (props: Partial<StudioToggableTextfieldProps>) => {
  const defaultProps: StudioToggableTextfieldProps = {
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
  return render(<StudioToggableTextfield {...defaultProps} {...props} />);
};

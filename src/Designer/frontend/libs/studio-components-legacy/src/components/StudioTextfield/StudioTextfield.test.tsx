import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { StudioTextfieldProps } from './StudioTextfield';
import { StudioTextfield } from './StudioTextfield';
import { StudioTextarea } from '../StudioTextarea';
import userEvent from '@testing-library/user-event';
import type { ForwardedRef } from 'react';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

describe('StudioTextfield', () => {
  it('Renders a text field', () => {
    renderTextfield();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('Renders with given label', () => {
    const label = 'test-label';
    renderTextfield({ label });
    expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument();
  });

  it('Renders with given label when there is an asterisk', () => {
    const label = 'test-label';
    renderTextfield({ label, withAsterisk: true });
    expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument();
  });

  it('Renders with the given value', () => {
    const value = 'test';
    renderTextfield({ value });
    expect(screen.getByRole('textbox')).toHaveValue(value);
  });

  it('Updates the value when the component rerenders with another value', () => {
    const value = 'test';
    const { rerender } = renderTextfield({ value });
    expect(screen.getByRole('textbox')).toHaveValue(value);
    const newValue = 'new value';
    rerender(<StudioTextarea value={newValue} />);
    expect(screen.getByRole('textbox')).toHaveValue(newValue);
  });

  it('Updates the value when the user types', async () => {
    const user = userEvent.setup();
    renderTextfield();
    const textfield = screen.getByRole('textbox');
    const newValue = 'new value';
    await user.type(textfield, newValue);
    expect(textfield).toHaveValue(newValue);
  });

  it('Calls the onChange handler when the user types', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderTextfield({ onChange });
    const textfield = screen.getByRole('textbox');
    const newValue = 'new value';
    await user.type(textfield, newValue);
    expect(onChange).toHaveBeenCalledTimes(newValue.length);
    const expectedTarget = expect.objectContaining({ value: newValue });
    const expectedEvent = expect.objectContaining({ target: expectedTarget });
    expect(onChange).toHaveBeenLastCalledWith(expectedEvent);
  });

  it('Calls the onBlur handler when the user blurs', async () => {
    const user = userEvent.setup();
    const onBlur = jest.fn();
    renderTextfield({ onBlur });
    const textfield = screen.getByRole('textbox');
    await user.click(textfield);
    await user.tab();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('Does not display the after blur error message by default', () => {
    const afterBlurError = 'error message';
    renderTextfield({ errorAfterBlur: afterBlurError });
    expect(screen.queryByText(afterBlurError)).not.toBeInTheDocument();
  });

  it('Does not display the after blur error message when the textarea is empty and the user blurs', async () => {
    const user = userEvent.setup();
    const errorAfterBlur = 'error message';
    renderTextfield({ errorAfterBlur });
    const textfield = screen.getByRole('textbox');
    await user.click(textfield);
    await user.tab();
    expect(screen.queryByText(errorAfterBlur)).not.toBeInTheDocument();
  });

  it('Does not display the message provided through the errorAfterBlur prop when the user types', async () => {
    const user = userEvent.setup();
    const errorAfterBlur = 'error message';
    renderTextfield({ errorAfterBlur });
    const textfield = screen.getByRole('textbox');
    await user.type(textfield, 'test');
    expect(screen.queryByText(errorAfterBlur)).not.toBeInTheDocument();
  });

  it('Displays the message provided through the errorAfterBlur prop when the use types something and then blurs', async () => {
    const user = userEvent.setup();
    const errorAfterBlur = 'error message';
    renderTextfield({ errorAfterBlur });
    const textfield = screen.getByRole('textbox');
    await user.type(textfield, 'test');
    await user.tab();
    expect(screen.getByText(errorAfterBlur)).toBeInTheDocument();
  });

  it('Diplays the message provided through the errorAfterBlur prop when the user types something after blurring', async () => {
    const user = userEvent.setup();
    const errorAfterBlur = 'error message';
    renderTextfield({ errorAfterBlur });
    const textfield = screen.getByRole('textbox');
    await user.type(textfield, 'test');
    await user.tab();
    await user.type(textfield, 'test');
    expect(screen.getByText(errorAfterBlur)).toBeInTheDocument();
  });

  it('Does not display the message provided through the errorAfterBlur prop when the user empties the textarea after blurring', async () => {
    const user = userEvent.setup();
    const errorAfterBlur = 'error message';
    renderTextfield({ errorAfterBlur });
    const textfield = screen.getByRole('textbox');
    await user.type(textfield, 'test');
    await user.tab();
    await user.clear(textfield);
    expect(screen.queryByText(errorAfterBlur)).not.toBeInTheDocument();
    await user.type(textfield, 'test');
    expect(screen.queryByText(errorAfterBlur)).not.toBeInTheDocument();
  });

  it('Displays the error message if it is set in the "error" prop', async () => {
    const user = userEvent.setup();
    const error = 'error message';
    renderTextfield({ error });
    expect(screen.getByText(error)).toBeInTheDocument();
    const textfield = screen.getByRole('textbox');
    await user.type(textfield, 'test');
    expect(screen.getByText(error)).toBeInTheDocument();
    await user.tab();
    await user.clear(textfield);
    expect(screen.getByText(error)).toBeInTheDocument();
  });

  it('Forwards the ref object to the textarea element if given', () => {
    testRefForwarding<HTMLInputElement>((ref) => renderTextfield({}, ref), getTextfield);
  });
});

const renderTextfield = (
  props: Partial<StudioTextfieldProps> = {},
  ref?: ForwardedRef<HTMLInputElement>,
) => render(<StudioTextfield {...props} ref={ref} />);

const getTextfield = (): HTMLInputElement => screen.getByRole('textbox');

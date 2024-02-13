import type { StudioTextareaProps } from './StudioTextarea';
import { StudioTextarea } from './StudioTextarea';
import { act, render, screen } from '@testing-library/react';
import type { RefObject } from 'react';
import React from 'react';
import userEvent from '@testing-library/user-event';

describe('StudioTextarea', () => {
  it('Renders a textarea', () => {
    renderTextarea();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('Renders with the given value', () => {
    const value = 'test';
    renderTextarea({ value });
    expect(screen.getByRole('textbox')).toHaveValue(value);
  });

  it('Updates the value when the component rerenders with another value', () => {
    const value = 'test';
    const { rerender } = renderTextarea({ value });
    expect(screen.getByRole('textbox')).toHaveValue(value);
    const newValue = 'new value';
    rerender(<StudioTextarea value={newValue} />);
    expect(screen.getByRole('textbox')).toHaveValue(newValue);
  });

  it('Updates the value when the user types', async () => {
    const user = userEvent.setup();
    renderTextarea();
    const textarea = screen.getByRole('textbox');
    const newValue = 'new value';
    await act(() => user.type(textarea, newValue));
    expect(textarea).toHaveValue(newValue);
  });

  it('Calls the onChange handler when the user types', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderTextarea({ onChange });
    const textarea = screen.getByRole('textbox');
    const newValue = 'new value';
    await act(() => user.type(textarea, newValue));
    expect(onChange).toHaveBeenCalledTimes(newValue.length);
    const expectedTarget = expect.objectContaining({ value: newValue });
    const expectedEvent = expect.objectContaining({ target: expectedTarget });
    expect(onChange).toHaveBeenLastCalledWith(expectedEvent);
  });

  it('Calls the onBlur handler when the user blurs', async () => {
    const user = userEvent.setup();
    const onBlur = jest.fn();
    renderTextarea({ onBlur });
    const textarea = screen.getByRole('textbox');
    await act(() => user.click(textarea));
    await act(() => user.tab());
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('Does not display the after blur error message by default', () => {
    const afterBlurError = 'error message';
    renderTextarea({ afterBlurError });
    expect(screen.queryByText(afterBlurError)).not.toBeInTheDocument();
  });

  it('Does not display the after blur error message when the textarea is empty and the user blurs', async () => {
    const user = userEvent.setup();
    const afterBlurError = 'error message';
    renderTextarea({ afterBlurError });
    const textarea = screen.getByRole('textbox');
    await act(() => user.click(textarea));
    await act(() => user.tab());
    expect(screen.queryByText(afterBlurError)).not.toBeInTheDocument();
  });

  it('Does not display the after blur error message when the user types', async () => {
    const user = userEvent.setup();
    const afterBlurError = 'error message';
    renderTextarea({ afterBlurError });
    const textarea = screen.getByRole('textbox');
    await act(() => user.type(textarea, 'test'));
    expect(screen.queryByText(afterBlurError)).not.toBeInTheDocument();
  });

  it('Displays the after blur error message when the use types something and then blurs', async () => {
    const user = userEvent.setup();
    const afterBlurError = 'error message';
    renderTextarea({ afterBlurError });
    const textarea = screen.getByRole('textbox');
    await act(() => user.type(textarea, 'test'));
    await act(() => user.tab());
    expect(screen.getByText(afterBlurError)).toBeInTheDocument();
  });

  it('Diplays the after blur error message when the user types something after blurring', async () => {
    const user = userEvent.setup();
    const afterBlurError = 'error message';
    renderTextarea({ afterBlurError });
    const textarea = screen.getByRole('textbox');
    await act(() => user.type(textarea, 'test'));
    await act(() => user.tab());
    await act(() => user.type(textarea, 'test'));
    expect(screen.getByText(afterBlurError)).toBeInTheDocument();
  });

  it('Does not display the after blur error message when the user empties the textarea after blurring', async () => {
    const user = userEvent.setup();
    const afterBlurError = 'error message';
    renderTextarea({ afterBlurError });
    const textarea = screen.getByRole('textbox');
    await act(() => user.type(textarea, 'test'));
    await act(() => user.tab());
    await act(() => user.clear(textarea));
    expect(screen.queryByText(afterBlurError)).not.toBeInTheDocument();
    await act(() => user.type(textarea, 'test'));
    expect(screen.queryByText(afterBlurError)).not.toBeInTheDocument();
  });

  it('Displays the error message if is is set in the "error" prop', async () => {
    const user = userEvent.setup();
    const error = 'error message';
    renderTextarea({ error });
    expect(screen.getByText(error)).toBeInTheDocument();
    const textarea = screen.getByRole('textbox');
    await act(() => user.type(textarea, 'test'));
    expect(screen.getByText(error)).toBeInTheDocument();
    await act(() => user.tab());
    await act(() => user.clear(textarea));
    expect(screen.getByText(error)).toBeInTheDocument();
  });

  it('Forwards the ref object to the textarea element if given', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    renderTextarea({}, ref);
    expect(ref.current).toBe(screen.getByRole('textbox'));
  });
});

const renderTextarea = (
  props: Partial<StudioTextareaProps> = {},
  ref?: RefObject<HTMLTextAreaElement>,
) => render(<StudioTextarea {...props} ref={ref} />);

import type { RefObject } from 'react';
import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import type { StudioDecimalInputProps } from './StudioDecimalInput';
import { StudioDecimalInput } from './StudioDecimalInput';
import userEvent from '@testing-library/user-event';

const description = 'description';
const onChange = jest.fn();
const validationErrorMessage: string = 'error';

const defaultProps: StudioDecimalInputProps = {
  description,
  onChange,
  value: undefined,
  validationErrorMessage,
};

describe('StudioDecimalInput', () => {
  afterEach(jest.clearAllMocks);

  it('should render description and input field', () => {
    render();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('Renders with given value', () => {
    const value = 123;
    render({ value });
    expect(screen.getByRole('textbox')).toHaveValue('123');
  });

  it('Renders with empty input value when value is undefined', () => {
    render();
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('should not show error message when input is an integer number and user clicks outside the field', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    await waitFor(() => user.type(inputElement, '123'));
    user.click(document.body);
    await waitFor(() =>
      expect(screen.queryByText('validation_errors.numbers_only')).not.toBeInTheDocument(),
    );
  });

  it('should not show error message when input is a decimal number and user clicks outside the field', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    await waitFor(() => user.type(inputElement, '123.456'));
    user.click(document.body);
    await waitFor(() =>
      expect(screen.queryByText('validation_errors.numbers_only')).not.toBeInTheDocument(),
    );
  });

  it('should not show error message when input is focused', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    await waitFor(() => user.type(inputElement, '123.456'));
    expect(screen.queryByText('validation_errors.numbers_only')).not.toBeInTheDocument();
  });

  it('should show error message when input is charachter and user clicks outside the field', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    await waitFor(() => user.type(inputElement, 'abc'));
    user.click(document.body);
    const errorMessage = await screen.findByText(validationErrorMessage);
    expect(errorMessage).toBeInTheDocument();
  });

  it("should allow decimal numbers with ','", async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    await waitFor(() => user.type(inputElement, '123,456'));
    expect(inputElement).toHaveValue('123,456');
  });

  it('should update input value with a new value', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    await waitFor(() => user.type(inputElement, '123.456'));
    expect(inputElement).toHaveValue('123.456');
    await waitFor(() => user.clear(inputElement));
    expect(inputElement).toHaveValue('');
    const newInputElement = screen.getByRole('textbox');
    await waitFor(() => user.type(newInputElement, '789.123'));
    expect(inputElement).toHaveValue('789.123');
  });

  it('should call onChange with correct value when input is valid', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    user.type(inputElement, '123.456');
    await waitFor(() => expect(defaultProps.onChange).toHaveBeenCalledWith(123.456));
  });

  it('should update input value on change', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    user.type(inputElement, '123');
    await waitFor(() => expect(inputElement).toHaveValue('123'));
  });

  it('should show error message when typing special charachter after number', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    await waitFor(() => user.type(inputElement, '123!'));
    user.click(document.body);
    const errorMessage = await screen.findByText(validationErrorMessage);
    expect(errorMessage).toBeInTheDocument();
  });

  it('should show error message when typing special characters like for example ! @ # ', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    await waitFor(() => user.type(inputElement, '!@#'));
    user.click(document.body);
    const errorMessage = await screen.findByText(validationErrorMessage);
    expect(errorMessage).toBeInTheDocument();
  });

  it('show error message when user types number followed by character and clicks outside the field', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    await waitFor(() => user.type(inputElement, '123abc'));
    user.click(document.body);
    const errorMessage = await screen.findByText(validationErrorMessage);
    expect(errorMessage).toBeInTheDocument();
  });

  it('Calls onChange function with correct number value when the user changes it', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    user.type(inputElement, '1,2');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(1.2));
  });

  it('Does not call onChange when value is invalid', async () => {
    const user = userEvent.setup();
    render();
    const inputElement = screen.getByRole('textbox');
    user.type(inputElement, 'abc');
    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });

  it('Updates the value when the component receives a new value prop', async () => {
    const { rerender } = render();
    const newValue = 12;
    rerender(<StudioDecimalInput {...defaultProps} value={newValue} />);
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveValue('12');
  });

  it('Renders with "0" as input value when value is 0', () => {
    const value = 0;
    render({ value });
    expect(screen.getByRole('textbox')).toHaveValue('0');
  });

  it('Accepts a ref prop', () => {
    const ref = React.createRef<HTMLInputElement>();
    render({}, ref);
    expect(ref.current).toBe(screen.getByRole('textbox'));
  });
});

const render = (
  props: Partial<StudioDecimalInputProps> = {},
  ref?: RefObject<HTMLInputElement>,
) => {
  const allProps: StudioDecimalInputProps = {
    ...defaultProps,
    ...props,
  };
  return rtlRender(<StudioDecimalInput {...allProps} ref={ref} />);
};

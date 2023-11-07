import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { StudioNumberInput, StudioNumberInputProps } from './StudioNumberInput';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
const description = 'description';
const onChange = jest.fn();

describe('StudioNumberInput', () => {
  it('should render description and input field', () => {
    render();
    expect(screen.getByText('description')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it("should allow decimal numbers with '.'", async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123.456'));
    expect(inputElement).toHaveValue('123.456');
  });

  it("should allow decimal numbers with ','", async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123,456'));
    expect(inputElement).toHaveValue('123,456');
  });

  it('should clall onChange with correct value when input is valid', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123.456'));
    expect(onChange).toHaveBeenCalledWith(123.456);
  });

  it('should call handleBlur when input is empty and user clicks outside of input field', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123.456'));
    expect(onChange).toHaveBeenCalledWith(123.456);
  });

  it('should not show error message when input is focused', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123.456'));
    expect(screen.queryByText('validation_errors.numbers_only')).not.toBeInTheDocument();
  });

  it('should update input value on change', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123'));
    expect(inputElement).toHaveValue('123');
  });

  it('should show error message when input is not a number and user clicks outside the field', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, 'abc'));
    await act(() => user.click(document.body));

    expect(screen.getByText(/validation_errors.numbers_only/i)).toBeInTheDocument();
  });

  it('show error message when user types number followed by character and clicks outside the field', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123abc'));
    await act(() => user.click(document.body));
    expect(screen.getByText(/validation_errors.numbers_only/i)).toBeInTheDocument();
  });
});

const render = (props: Partial<StudioNumberInputProps> = {}) => {
  const allProps: StudioNumberInputProps = {
    description,
    onChange,
    ...props,
  } as StudioNumberInputProps;
  rtlRender(<StudioNumberInput {...allProps} />);
};

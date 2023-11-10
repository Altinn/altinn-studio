import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { StudioDecimalInput, StudioDecimalInputProps } from './StudioDecimalInput';
import userEvent from '@testing-library/user-event';
import { convertStringToNumber } from './utils';
import { convertNumberToString } from './utils';
import { textMock } from '../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();
const description = 'description';
const onChange = jest.fn();
const value = '123.456';

describe('StudioDecimalInput', () => {
  it('should render description and input field', () => {
    render();
    expect(screen.getByText('description')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should not show error message when input is an integer number and user clicks outside the field', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123'));
    await act(() => user.click(document.body));
    expect(screen.queryByText('validation_errors.numbers_only')).not.toBeInTheDocument();
  });

  it('should not show error message when input is a decimal number and user clicks outside the field', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123.456'));
    await act(() => user.click(document.body));
    expect(screen.queryByText('validation_errors.numbers_only')).not.toBeInTheDocument();
  });

  it('should not show error message when input is focused', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123.456'));
    expect(screen.queryByText('validation_errors.numbers_only')).not.toBeInTheDocument();
  });

  it('should show error message when input is charachter and user clicks outside the field', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, 'abc'));
    await act(() => user.click(document.body));
    expect(screen.getByText(textMock('validation_errors.numbers_only'))).toBeInTheDocument();
  });

  it("should allow decimal numbers with ','", async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123,456'));
    expect(inputElement).toHaveValue('123,456');
  });

  it('should update input value with a new value', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123.456'));
    expect(inputElement).toHaveValue('123.456');
    await act(() => user.clear(inputElement));
    expect(inputElement).toHaveValue('');
    const newInputElement = screen.getByRole('textbox');
    await act(() => user.type(newInputElement, '789.123'));
    expect(inputElement).toHaveValue('789.123');
  });

  it("should convert string to number with '.' ", () => {
    const result = convertStringToNumber('123,456');
    expect(result).toEqual(123.456);
  });

  it("should convert number to string with ','", () => {
    const result = convertNumberToString(123.456);
    expect(result).toEqual('123,456');
  });

  it('should call onChange with correct value when input is valid', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123.456'));
    expect(onChange).toHaveBeenCalledWith(123.456);
  });

  it('should update input value on change', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123'));
    expect(inputElement).toHaveValue('123');
  });

  it('should show error message when typing special charachter after number', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123!'));
    await act(() => user.click(document.body));
    expect(screen.getByText(textMock('validation_errors.numbers_only'))).toBeInTheDocument();
  });

  it('should show error message when typing special characters like for example ! @ # ', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '!@#'));
    await act(() => user.click(document.body));
    expect(screen.getByText(textMock('validation_errors.numbers_only'))).toBeInTheDocument();
  });

  it('show error message when user types number followed by character and clicks outside the field', async () => {
    render();
    const inputElement = screen.getByRole('textbox');
    await act(() => user.type(inputElement, '123abc'));
    await act(() => user.click(document.body));
    expect(screen.getByText(textMock('validation_errors.numbers_only'))).toBeInTheDocument();
  });
});

const render = (props: Partial<StudioDecimalInputProps> = {}) => {
  const allProps: StudioDecimalInputProps = {
    description,
    onChange,
    value,
    ...props,
  } as StudioDecimalInputProps;
  rtlRender(<StudioDecimalInput {...allProps} />);
};

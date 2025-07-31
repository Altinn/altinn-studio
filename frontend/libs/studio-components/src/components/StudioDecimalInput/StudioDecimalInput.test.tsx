import React from 'react';
import type { ForwardedRef } from 'react';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioDecimalInput } from './StudioDecimalInput';
import type { StudioDecimalInputProps } from './StudioDecimalInput';

const ariaLabel = 'test label';
const description = 'description';
const validationErrorMessage: string = 'error';

const defaultProps: StudioDecimalInputProps = {
  'aria-label': ariaLabel,
  description,
  validationErrorMessage,
};

describe('StudioDecimalInput', () => {
  afterEach(jest.clearAllMocks);

  it('should render description and input field', () => {
    renderDecimalInput();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('Renders with given value', () => {
    const value = 123;
    const props: StudioDecimalInputProps = { ...defaultProps, value };
    renderDecimalInput(props);
    expect(screen.getByRole('textbox')).toHaveValue('123');
  });

  it('Renders with empty input value when value is undefined', () => {
    renderDecimalInput();
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('should not show error message when input is an integer number and user clicks outside the field', async () => {
    const user = userEvent.setup();
    renderDecimalInput();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '123');
    await user.click(document.body);
    expect(screen.queryByText('validation_errors.numbers_only')).not.toBeInTheDocument();
  });

  it('should not show error message when input is a decimal number and user clicks outside the field', async () => {
    const user = userEvent.setup();
    renderDecimalInput();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '123.456');
    await user.click(document.body);
    expect(screen.queryByText('validation_errors.numbers_only')).not.toBeInTheDocument();
  });

  it('should not show error message when input is focused', async () => {
    const user = userEvent.setup();
    renderDecimalInput();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '123.456');
    expect(screen.queryByText('validation_errors.numbers_only')).not.toBeInTheDocument();
  });

  it('should show error message when input is charachter and user clicks outside the field', async () => {
    const user = userEvent.setup();
    renderDecimalInput();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, 'abc');
    await user.click(document.body);
    expect(screen.getByText(validationErrorMessage)).toBeInTheDocument();
  });

  it("should allow decimal numbers with ','", async () => {
    const user = userEvent.setup();
    renderDecimalInput();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '123,456');
    expect(inputElement).toHaveValue('123,456');
  });

  it('should update input value with a new value', async () => {
    const user = userEvent.setup();
    renderDecimalInput();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '123.456');
    expect(inputElement).toHaveValue('123.456');
    await user.clear(inputElement);
    expect(inputElement).toHaveValue('');
    const newInputElement = screen.getByRole('textbox');
    await user.type(newInputElement, '789.123');
    expect(inputElement).toHaveValue('789.123');
  });

  it('should call onChangeNumber with correct value when input is valid', async () => {
    const user = userEvent.setup();
    const onChangeNumber = jest.fn();
    const props: StudioDecimalInputProps = { ...defaultProps, onChangeNumber };
    renderDecimalInput(props);
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '123.456');
    expect(onChangeNumber).toHaveBeenCalledWith(123.456);
  });

  it(' should call onChangeNumber with correct number value when the user changes it', async () => {
    const user = userEvent.setup();
    const onChangeNumber = jest.fn();
    const props: StudioDecimalInputProps = { ...defaultProps, onChangeNumber };
    renderDecimalInput(props);
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '1,2');
    expect(onChangeNumber).toHaveBeenLastCalledWith(1.2);
  });

  it('should not call onChangeNumber when value is invalid', async () => {
    const user = userEvent.setup();
    const onChangeNumber = jest.fn();
    const props: StudioDecimalInputProps = { ...defaultProps, onChangeNumber };
    renderDecimalInput(props);
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, 'abc');
    expect(onChangeNumber).not.toHaveBeenCalled();
  });

  it('should call onBlurNumber with correct value when input is valid', async () => {
    const user = userEvent.setup();
    const onBlurNumber = jest.fn();
    const props: StudioDecimalInputProps = { ...defaultProps, onBlurNumber };
    renderDecimalInput(props);
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '123.456');
    await user.tab();
    expect(onBlurNumber).toHaveBeenCalledTimes(1);
    expect(onBlurNumber).toHaveBeenCalledWith(123.456);
  });

  it('should update input value on change', async () => {
    const user = userEvent.setup();
    renderDecimalInput();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '123');
    expect(inputElement).toHaveValue('123');
  });

  it('should show error message when typing special charachter after number', async () => {
    const user = userEvent.setup();
    renderDecimalInput();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '123!');
    await user.click(document.body);
    expect(screen.getByText(validationErrorMessage)).toBeInTheDocument();
  });

  it('should show error message when typing special characters like for example ! @ # ', async () => {
    const user = userEvent.setup();
    renderDecimalInput();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '!@#');
    await user.click(document.body);
    expect(screen.getByText(validationErrorMessage)).toBeInTheDocument();
  });

  it('should show error message when user types number followed by character and clicks outside the field', async () => {
    const user = userEvent.setup();
    renderDecimalInput();
    const inputElement = screen.getByRole('textbox');
    await user.type(inputElement, '123abc');
    await user.click(document.body);
    expect(screen.getByText(validationErrorMessage)).toBeInTheDocument();
  });

  it('should update the value when the component receives a new value prop', async () => {
    const { rerender } = renderDecimalInput();
    const newValue = 12;
    rerender(<StudioDecimalInput aria-label={ariaLabel} value={newValue} />);
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveValue('12');
  });

  it('should render with "0" as input value when value is 0', () => {
    const value = 0;
    const props: StudioDecimalInputProps = { ...defaultProps, value };
    renderDecimalInput(props);
    expect(screen.getByRole('textbox')).toHaveValue('0');
  });

  it('should accept a ref prop', () => {
    const renderComponent = (ref: ForwardedRef<HTMLInputElement>): RenderResult =>
      renderDecimalInput(defaultProps, ref);
    const getTextbox = (): HTMLElement => screen.getByRole('textbox');
    testRefForwarding(renderComponent, getTextbox);
  });
});

const renderDecimalInput = (
  props: StudioDecimalInputProps = defaultProps,
  ref?: ForwardedRef<HTMLInputElement>,
): RenderResult => {
  return render(<StudioDecimalInput {...props} ref={ref} />);
};

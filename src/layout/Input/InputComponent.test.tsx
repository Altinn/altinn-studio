import React from 'react';

import { act, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { InputComponent } from 'src/layout/Input/InputComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

describe('InputComponent', () => {
  jest.useFakeTimers();
  const user = userEvent.setup({
    advanceTimers: (time) => {
      act(() => {
        jest.advanceTimersByTime(time);
      });
    },
  });

  it('should correct value with no form data provided', () => {
    render();
    const inputComponent = screen.getByRole('textbox');

    expect(inputComponent).toHaveValue('');
  });

  it('should have correct value with specified form data', () => {
    const simpleBindingValue = 'it123';
    render({
      genericProps: {
        formData: {
          simpleBinding: simpleBindingValue,
        },
      },
    });
    const inputComponent = screen.getByRole('textbox') as HTMLInputElement;

    expect(inputComponent.value).toEqual(simpleBindingValue);
  });

  it('should have correct form data after user types in field', async () => {
    const typedValue = 'banana';
    render();
    const inputComponent = screen.getByRole('textbox');

    await act(() => user.type(inputComponent, typedValue));

    expect(inputComponent).toHaveValue(typedValue);
  });

  it('should call supplied dataChanged function after data change', async () => {
    const handleDataChange = jest.fn();
    const typedValue = 'test input';
    render({ genericProps: { handleDataChange } });
    const inputComponent = screen.getByRole('textbox');

    await act(() => user.type(inputComponent, typedValue));

    expect(inputComponent).toHaveValue(typedValue);
    expect(handleDataChange).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(handleDataChange).toHaveBeenCalled();
  });

  it('should call supplied dataChanged function immediately after onBlur', async () => {
    const handleDataChange = jest.fn();
    const typedValue = 'test input';
    render({ genericProps: { handleDataChange } });
    const inputComponent = screen.getByRole('textbox');

    await act(async () => {
      await user.type(inputComponent, typedValue);
      await user.tab();
    });

    expect(inputComponent).toHaveValue(typedValue);
    expect(handleDataChange).toHaveBeenCalledWith(typedValue, { validate: true });
  });

  it('should render input with formatted number when this is specified', async () => {
    const handleDataChange = jest.fn();
    const inputValuePlainText = '123456';
    const inputValueFormatted = '$123,456';
    const typedValue = '789';
    const finalValuePlainText = `${inputValuePlainText}${typedValue}`;
    const finalValueFormatted = '$123,456,789';
    render({
      genericProps: {
        handleDataChange,
        formData: {
          simpleBinding: inputValuePlainText,
        },
      },
      component: {
        formatting: {
          number: {
            thousandSeparator: true,
            prefix: '$',
          },
        },
      },
    });
    const inputComponent = screen.getByRole('textbox');
    expect(inputComponent).toHaveValue(inputValueFormatted);

    await act(async () => {
      await user.type(inputComponent, typedValue);
      await user.tab();
    });

    expect(inputComponent).toHaveValue(finalValueFormatted);
    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith(finalValuePlainText, { validate: true });
  });

  it('should show aria-describedby if textResourceBindings.description is present', () => {
    render({
      component: {
        textResourceBindings: {
          description: 'description',
        },
      },
    });

    const inputComponent = screen.getByRole('textbox');
    expect(inputComponent).toHaveAttribute('aria-describedby', 'description-mock-id');
  });

  it('should not show aria-describedby if textResourceBindings.description is not present', () => {
    render();
    const inputComponent = screen.getByRole('textbox');

    expect(inputComponent).not.toHaveAttribute('aria-describedby');
  });

  const render = ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'Input'>> = {}) => {
    renderGenericComponentTest({
      type: 'Input',
      renderer: (props) => <InputComponent {...props} />,
      component: {
        id: 'mock-id',
        readOnly: false,
        required: false,

        ...component,
      },
      genericProps: {
        handleDataChange: jest.fn(),
        isValid: true,
        ...genericProps,
      },
    });
  };
});

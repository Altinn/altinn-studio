import * as React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import { InputComponent } from 'src/components/base/InputComponent';
import { mockDelayBeforeSaving } from 'src/components/hooks/useDelayedSavedState';
import type { IComponentProps } from 'src/components';
import type { IInputProps } from 'src/components/base/InputComponent';

describe('InputComponent.tsx', () => {
  const mockId = 'mock-id';
  const mockFormData = null;
  const mockHandleDataChange = jest.fn();
  const mockIsValid = true;
  const mockReadOnly = false;
  const mockRequired = false;

  it('should correct value with no form data provided', () => {
    renderInputComponent();
    const inputComponent = screen.getByTestId(mockId);

    expect(inputComponent).toHaveValue('');
  });

  it('should have correct value with specified form data', () => {
    const customProps: Partial<IComponentProps> = {
      formData: { simpleBinding: 'it123' },
    };
    renderInputComponent(customProps);
    const inputComponent: any = screen.getByTestId(mockId);

    expect(inputComponent.value).toEqual('it123');
  });

  it('should have correct form data after change', () => {
    renderInputComponent();
    const inputComponent = screen.getByTestId(mockId);

    fireEvent.change(inputComponent, { target: { value: 'it' } });

    expect(inputComponent).toHaveValue('it');
  });

  it('should call supplied dataChanged function after data change', async () => {
    const handleDataChange = jest.fn();
    renderInputComponent({ handleDataChange });
    const inputComponent = screen.getByTestId(mockId);

    mockDelayBeforeSaving(25);
    fireEvent.change(inputComponent, { target: { value: 'it123' } });
    expect(inputComponent).toHaveValue('it123');
    expect(handleDataChange).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 25));
    expect(handleDataChange).toHaveBeenCalled();
    mockDelayBeforeSaving(undefined);
  });

  it('should call supplied dataChanged function immediately after onBlur', async () => {
    const handleDataChange = jest.fn();
    renderInputComponent({ handleDataChange });
    const inputComponent = screen.getByTestId(mockId);

    fireEvent.change(inputComponent, { target: { value: 'it123' } });
    fireEvent.blur(inputComponent);
    expect(inputComponent).toHaveValue('it123');
    expect(handleDataChange).toHaveBeenCalledWith(
      'it123',
      undefined,
      false,
      false,
    );
  });

  it('should render input with formatted number when this is specified', () => {
    const handleDataChange = jest.fn();
    renderInputComponent({
      handleDataChange,
      formatting: {
        number: {
          thousandSeparator: true,
          prefix: '$',
        },
      },
      formData: { simpleBinding: '123456' },
    });
    const inputComponent = screen.getByTestId(`${mockId}-formatted-number`);
    expect(inputComponent).toHaveValue('$123,456');

    fireEvent.change(inputComponent, { target: { value: '1234567' } });
    fireEvent.blur(inputComponent);
    expect(inputComponent).toHaveValue('$1,234,567');
    expect(handleDataChange).toHaveBeenCalledTimes(1);
    expect(handleDataChange).toHaveBeenCalledWith(
      '1234567',
      undefined,
      false,
      false,
    );
  });

  it('should show aria-describedby if textResourceBindings.description is present', () => {
    renderInputComponent({
      textResourceBindings: {
        description: 'description',
      },
    });

    const inputComponent = screen.getByTestId(mockId);
    expect(inputComponent).toHaveAttribute(
      'aria-describedby',
      'description-mock-id',
    );
  });

  it('should not show aria-describedby if textResourceBindings.description is not present', () => {
    renderInputComponent();
    const inputComponent = screen.getByTestId(mockId);
    expect(inputComponent).not.toHaveAttribute('aria-describedby');
  });

  function renderInputComponent(props: Partial<IInputProps> = {}) {
    const defaultProps: IInputProps = {
      id: mockId,
      formData: mockFormData,
      handleDataChange: mockHandleDataChange,
      isValid: mockIsValid,
      readOnly: mockReadOnly,
      required: mockRequired,
    } as unknown as IInputProps;

    render(
      <InputComponent
        {...defaultProps}
        {...props}
      />,
    );
  }
});

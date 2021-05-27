/* tslint:disable:jsx-wrap-multiline */
import '@testing-library/jest-dom/extend-expect';
import 'jest';
import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { InputComponent, IInputProps } from '../../../src/components/base/InputComponent';

describe('components/base/InputComponent.tsx', () => {
  let mockId: string;
  let mockFormData: any;
  let mockHandleDataChange: () => void;
  let mockIsValid: boolean;
  let mockReadOnly: boolean;
  let mockRequired: boolean;

  beforeEach(() => {
    mockId = 'mock-id';
    mockFormData = null;
    mockHandleDataChange = jest.fn();
    mockIsValid = true;
    mockReadOnly = false;
    mockRequired = false;
  });

  test('components/base/InputComponent.tsx -- should match snapshot', () => {
    const { asFragment } = renderInputComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  test('components/base/InputComponent.tsx -- should correct value with no form data provided', async () => {
    const { findByTestId } = renderInputComponent();
    const inputComponent: any = await findByTestId(mockId);

    expect(inputComponent.value).toEqual('');
  });

  test('components/base/InputComponent.tsx -- should have correct value with specified form data', async () => {
    const customProps = { formData: 'Test123' };
    const { findByTestId } = renderInputComponent(customProps);
    const inputComponent: any = await findByTestId(mockId);

    expect(inputComponent.value).toEqual('Test123');
  });

  test('components/base/InputComponent.tsx -- should have correct form data after change', async () => {
    const { findByTestId } = renderInputComponent();
    const inputComponent: any = await findByTestId(mockId);

    fireEvent.change(inputComponent, { target: { value: 'test' } });

    expect(inputComponent.value).toEqual('test');
  });

  test('components/base/InputComponent.tsx -- should call supplied dataChanged function after data change', async () => {
    const handleDataChange = jest.fn();
    const { findByTestId } = renderInputComponent({ handleDataChange });
    const inputComponent: any = await findByTestId(mockId);

    fireEvent.blur(inputComponent, { target: { value: 'Test123' } });
    expect(inputComponent.value).toEqual('Test123');
    expect(handleDataChange).toHaveBeenCalled();
  });

  test('components/base/InputComponent.tsx -- should render input with formatted number when this is specified', async () => {
    const { findByTestId } = renderInputComponent({
      formatting: {
        number: {
          thousandSeparator: true,
          prefix: '$',
        },
      },
      formData: '1234',
    });
    const inputComponent: any = await findByTestId(`${mockId}-formatted-number`);
    expect(inputComponent.value).toEqual('$1,234');
  });

  function renderInputComponent(props: Partial<IInputProps> = {}) {
    const defaultProps: IInputProps = {
      id: mockId,
      formData: mockFormData,
      handleDataChange: mockHandleDataChange,
      isValid: mockIsValid,
      readOnly: mockReadOnly,
      required: mockRequired,
    };

    return render(<InputComponent {...defaultProps} {...props}/>);
  }
});

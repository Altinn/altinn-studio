import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextFieldWithValidation, TextFieldWithValidationProps } from './TextFieldWithValidation';

const renderTextFieldWithValidation = ({
  name,
  label,
  value,
  validation,
  onChange
}: Partial<TextFieldWithValidationProps>) => {
  const user = userEvent.setup();
  render(
    <TextFieldWithValidation
      name={name}
      label={label}
      value={value}
      validation={validation}
      onChange={onChange}
    />
  );

  return { user };
};

test('should display an error message if no value is entered in a required field', async () => {
  const onChangeMock = jest.fn();
  const { user } = renderTextFieldWithValidation({
    label: 'Age',
    name: 'age',
    validation: {
      required: {
        message: 'Age is required'
      }
    },
    onChange: onChangeMock
  });

  const inputField = screen.getByLabelText('Age *');
  await user.type(inputField, '1');
  await user.clear(inputField);

  expect(screen.getByText('Age is required')).toBeInTheDocument();
});

test('should display asterisk and have aria-required on required field', () => {
  renderTextFieldWithValidation({
    label: 'Name',
    name: 'name',
    validation: { required: { message: 'Name is required' } }
  });

  const inputField = screen.getByLabelText('Name *');
  expect(inputField).toBeInTheDocument();
  expect(inputField).toHaveAttribute('aria-required', 'true');
});

test('should not display asterisk on non-required fields', () => {
  renderTextFieldWithValidation({
    label: 'Last name',
    name: 'lastName'
  });

  expect(screen.queryByLabelText('Last name *')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Last name')).toHaveAttribute('aria-required', 'false');
});

test('should display an error message and and call onChange if input is invalid', async () => {
  const onChangeMock = jest.fn();
  const { user } = renderTextFieldWithValidation({
    label: 'Age',
    name: 'age',
    validation: {
      valueAsNumber: {
        message: 'Age must be typeof number.'
      }
    },
    onChange: onChangeMock
  });

  await user.type(screen.getByLabelText('Age'), 'A');
  expect(onChangeMock).toHaveBeenCalled();
  expect(screen.getByText('Age must be typeof number.')).toBeInTheDocument();
});

test('should call onChange and should not display error message when input is valid', async () => {
  const onChangeMock = jest.fn();
  const { user } = renderTextFieldWithValidation({
    label: 'Age',
    name: 'age',
    validation: {
      valueAsNumber: {
        message: 'Age must be typeof number'
      }
    },
    onChange: onChangeMock
  });

  await user.type(screen.getByLabelText('Age'), '8');
  expect(onChangeMock).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Age must be typeof number')).not.toBeInTheDocument();
});

test('should have aria-invalid and aria-errormessage when the component has error', async () => {
  const { user } = renderTextFieldWithValidation({
    label: 'Age',
    name: 'age',
    validation: {
      valueAsNumber: {
        message: 'Age must be typeof number'
      }
    },
    onChange: () => {}
  });

  const inputField = screen.getByLabelText('Age');
  expect(inputField).toHaveAttribute('aria-invalid', 'false');

  await user.type(inputField, 'My age is');

  expect(inputField).toHaveAttribute('aria-invalid', 'true');
  expect(inputField).toHaveAttribute('aria-errormessage');
});

test('error message should be hidden when aria-invalid is false', async () => {
  const { user } = renderTextFieldWithValidation({
    label: 'Age',
    name: 'age',
    validation: {
      valueAsNumber: {
        message: 'Age must be typeof number'
      }
    },
    onChange: () => {}
  });

  const inputField = screen.getByLabelText('Age');

  await user.type(inputField, '18');

  expect(inputField).toHaveAttribute('aria-invalid', 'false');
  expect(screen.queryByText('Age must be typeof number')).not.toBeInTheDocument();
});

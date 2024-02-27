import React from 'react';
import { StudioTextfieldSchema, type StudioTextfieldSchemaProps } from './StudioTextfieldSchema';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// TODO complete the test

// const handleOnChange = jest.fn();

describe('StudioTextfieldSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should invoke "onError" callback and not "onChange" callback if schema validation has errors', async () => {
    const mockValidateProperty = jest.fn().mockReturnValue('error');
    const onErrorMock = jest.fn();
    const onChangeMock = jest.fn();
    const user = userEvent.setup();

    renderStudioTextfieldSchema({
      onError: onErrorMock,
      viewProps: {
        children: 'My button text',
      },
      inputProps: {
        label: 'My awesome label',
        icon: <div />,
      },
      jsonValidator: {
        getSchema: jest.fn(),
        validateProperty: mockValidateProperty,
      },
    });

    const editComponentIdButton = screen.getByRole('button', { name: 'My button text' });
    await act(() => user.click(editComponentIdButton));

    const input = screen.getByLabelText('My awesome label');

    const inputValue = 'test';
    await act(() => user.type(input, inputValue));

    expect(onErrorMock).toHaveBeenCalledTimes(inputValue.length);
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  // it('should render StudioTextfieldSchema', async () => {
  //   renderStudioTextfieldSchema();
  //   expect(screen.getByText('test')).toBeInTheDocument();
  // });
  //
  // it('should call handleOnchange when changing text input', async () => {
  //   const user = userEvent.setup();
  //   renderStudioTextfieldSchema({
  //     inputProps: { onChange: handleOnChange, icon: <div>icon</div> },
  //   });
  //   const editComponentIdButton = screen.getByRole('button', { name: /test/i });
  //   expect(editComponentIdButton).toBeInTheDocument();
  //   await act(() => user.click(editComponentIdButton));
  //   const input = screen.getByRole('textbox');
  //   await act(() => user.type(input, 'test'));
  //   expect(handleOnChange).toHaveBeenCalled();
  // });
  //
  // it('should run schema validation when changing text input', async () => {
  //   const mockValidateProperty = jest.fn();
  //   const user = userEvent.setup();
  //
  //   renderStudioTextfieldSchema({
  //     jsonValidator: {
  //       getSchema: jest.fn(),
  //       validateProperty: mockValidateProperty,
  //     },
  //     inputProps: { onChange: handleOnChange, icon: <div>icon</div> },
  //   });
  //
  //   const editComponentIdButton = screen.getByRole('button', { name: 'test' });
  //   await act(() => user.click(editComponentIdButton));
  //
  //   const input = screen.getByRole('textbox');
  //   await act(() => user.type(input, 'test'));
  //
  //   expect(mockValidateProperty).toHaveBeenCalled();
  // });
});

const renderStudioTextfieldSchema = <T,>(props: Partial<StudioTextfieldSchemaProps<T>> = {}) => {
  const defaultProps: StudioTextfieldSchemaProps<T> = {
    jsonValidator: {
      getSchema: jest.fn(),
      validateProperty: jest.fn(),
    },
    schema: {
      $id: 'test',
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
      },
    } as StudioTextfieldSchemaProps<any>['schema'],
    propertyPath: 'properties/id',
    inputProps: {
      id: 'test',
      value: 'test',
      onChange: jest.fn(),

      icon: <div>icon</div>,
    },
    viewProps: {
      children: 'test',
      variant: 'tertiary',
    },
  };
  return render(<StudioTextfieldSchema {...defaultProps} {...props} />);
};

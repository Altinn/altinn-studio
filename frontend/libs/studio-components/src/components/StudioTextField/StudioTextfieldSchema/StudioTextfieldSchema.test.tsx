import React from 'react';
import { StudioJSONValidatorUtils } from '../StudioJSONValidatorUtils';
import { StudioTextfieldSchema, type StudioTextfieldSchemaProps } from './StudioTextfieldSchema';
import type { JsonSchema } from '../../../../../../packages/shared/src/types/JsonSchema';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const handleOnChange = jest.fn();

describe('StudioTextfieldSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render StudioTextfieldSchema', async () => {
    renderStudioTextfieldSchema();
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('should call handleOnchange when changing text input', async () => {
    const user = userEvent.setup();
    renderStudioTextfieldSchema({
      inputProps: { onChange: handleOnChange, icon: <div>icon</div> },
    });
    const editComponentIdButton = screen.getByRole('button', { name: /test/i });
    expect(editComponentIdButton).toBeInTheDocument();
    await act(() => user.click(editComponentIdButton));
    const input = screen.getByRole('textbox');
    await act(() => user.type(input, 'test'));
    expect(handleOnChange).toHaveBeenCalled();
  });

  it('should call validateAgainstSchema when changing text input', async () => {
    const user = userEvent.setup();
    const spyValidateAgainstSchema = jest.spyOn(
      StudioJSONValidatorUtils.prototype,
      'validateProperty',
    );
    renderStudioTextfieldSchema({
      inputProps: { onChange: handleOnChange, icon: <div>icon</div> },
    });
    const editComponentIdButton = screen.getByRole('button', { name: /test/i });
    expect(editComponentIdButton).toBeInTheDocument();
    await act(() => user.click(editComponentIdButton));
    const input = screen.getByRole('textbox');
    await act(() => user.type(input, 'test'));
    expect(handleOnChange).toHaveBeenCalled();
    expect(spyValidateAgainstSchema).toHaveBeenCalled();
    spyValidateAgainstSchema.mockRestore();
  });
});

const renderStudioTextfieldSchema = (props: Partial<StudioTextfieldSchemaProps> = {}) => {
  const defaultProps: StudioTextfieldSchemaProps = {
    jsonValidator: {
      getSchema: jest.fn(),
    },
    schema: {
      $id: 'test',
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
      },
    } as JsonSchema,
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

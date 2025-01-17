import type { JsonSchema } from '../../types/JSONSchema';
import React from 'react';
import {
  StudioToggleableTextfieldSchema,
  type StudioToggleableTextfieldSchemaProps,
} from './StudioToggleableTextfieldSchema';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const defaultLayoutSchemaMock: JsonSchema = {
  $id: 'id',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  definitions: {
    component: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          title: 'id',
          pattern: '^[0-9a-zA-Z][0-9a-zA-Z-]*(-?[a-zA-Z]+|[a-zA-Z][0-9]+|-[0-9]{6,})$',
          description:
            'The component ID. Must be unique within all layouts/pages in a layout-set. Cannot end with <dash><number>.',
        },
      },
      required: ['id'],
    },
  },
};
const value: string = 'value';
const label: string = 'label';
const defaultProps: StudioToggleableTextfieldSchemaProps = {
  layoutSchema: defaultLayoutSchemaMock,
  relatedSchemas: [],
  label,
  value,
  onChange: jest.fn(),
  propertyPath: 'definitions/component/properties/id',
  onError: jest.fn(),
};

describe('StudioToggleableTextfieldSchema', () => {
  beforeEach(jest.clearAllMocks);

  it('should toggle to edit mode when clicking edit', async () => {
    const user = userEvent.setup();
    renderStudioTextfieldSchema();
    const viewButton = screen.getByRole('button', { name: label });
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toHaveTextContent(value);
    await user.click(viewButton);
    const editTextfield = screen.getByRole('textbox', { name: label });
    expect(editTextfield).toBeInTheDocument();
    expect(editTextfield).toHaveValue(value);
  });

  it('should toggle to view mode on blur', async () => {
    const user = userEvent.setup();
    renderStudioTextfieldSchema();
    await user.click(screen.getByRole('button', { name: label }));
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });

  it('should not toggle to view mode on blur if input is invalid', async () => {
    const user = userEvent.setup();
    const error: string = 'error message';
    renderStudioTextfieldSchema({
      ...defaultProps,
      error,
    });
    await user.click(screen.getByRole('button', { name: label }));
    await user.tab();
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
  });

  it('should validate field against json schema and invoke "onError" if validation has errors', async () => {
    const user = userEvent.setup();
    renderStudioTextfieldSchema();
    await user.click(screen.getByRole('button', { name: label }));
    await user.type(screen.getByRole('textbox', { name: label }), 'invalid-value-01');
    expect(defaultProps.onError).toHaveBeenCalledWith({
      errorCode: 'pattern',
      details: 'Result of validate property',
    });
  });

  it('should validate field against json schema and invoke "onError" if field is required', async () => {
    const user = userEvent.setup();
    renderStudioTextfieldSchema();
    await user.click(screen.getByRole('button', { name: label }));
    await user.clear(screen.getByRole('textbox', { name: label }));
    expect(defaultProps.onError).toHaveBeenCalledWith({
      errorCode: 'required',
      details: 'Property value is required',
    });
  });

  it('should invoke onChange and onError when input changes with error', async () => {
    const user = userEvent.setup();
    const invalidValue = 'invalid-value-01';
    renderStudioTextfieldSchema();
    await user.click(screen.getByRole('button', { name: label }));
    await user.type(screen.getByRole('textbox', { name: label }), invalidValue);
    expect(defaultProps.onError).toHaveBeenCalledWith({
      errorCode: 'pattern',
      details: 'Result of validate property',
    });
    expect(defaultProps.onChange).toHaveBeenCalledTimes(invalidValue.length);
  });
});

const renderStudioTextfieldSchema = (props: Partial<StudioToggleableTextfieldSchemaProps> = {}) => {
  return render(<StudioToggleableTextfieldSchema {...defaultProps} {...props} />);
};

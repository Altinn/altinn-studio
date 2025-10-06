import type { JsonSchema } from '../../types/JSONSchema.ts';

import React from 'react';
import {
  StudioToggleableTextfieldSchema,
  type StudioToggleableTextfieldSchemaProps,
} from './StudioToggleableTextfieldSchema';
import type { RenderResult } from '@testing-library/react';
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
  icon: <div />,
  label,
  layoutSchema: defaultLayoutSchemaMock,
  relatedSchemas: [],
  onBlur: jest.fn(),
  onChange: jest.fn(),
  onError: jest.fn(),
  value,
  propertyPath: 'definitions/component/properties/id',
};

describe('StudioToggleableTextfieldSchema', () => {
  beforeEach(jest.clearAllMocks);

  it('should toggle to edit mode when clicking edit', async () => {
    const user = userEvent.setup();
    renderStudioToggleableTextfieldSchema();
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
    renderStudioToggleableTextfieldSchema();
    await user.click(screen.getByRole('button', { name: label }));
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument();
  });

  it('should not toggle to view mode on blur if input is invalid', async () => {
    const user = userEvent.setup();
    const error: string = 'error message';
    renderStudioToggleableTextfieldSchema({ error });
    await user.click(screen.getByRole('button', { name: label }));
    await user.tab();
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
  });

  it('should validate field against json schema and invoke "onError" if validation has errors', async () => {
    const user = userEvent.setup();
    renderStudioToggleableTextfieldSchema();
    await user.click(screen.getByRole('button', { name: label }));
    await user.type(screen.getByRole('textbox', { name: label }), 'invalid-value-01');
    expect(defaultProps.onError).toHaveBeenCalledWith({
      errorCode: 'pattern',
      details: 'Result of validate property',
    });
  });

  it('should validate field against json schema and invoke "onError" if field is required', async () => {
    const user = userEvent.setup();

    renderStudioToggleableTextfieldSchema();
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
    renderStudioToggleableTextfieldSchema();
    await user.click(screen.getByRole('button', { name: label }));
    await user.type(screen.getByRole('textbox', { name: label }), invalidValue);
    expect(defaultProps.onError).toHaveBeenCalledWith({
      errorCode: 'pattern',
      details: 'Result of validate property',
    });
    expect(defaultProps.onChange).toHaveBeenCalledTimes(invalidValue.length);
  });
});

const renderStudioToggleableTextfieldSchema = (
  props: Partial<StudioToggleableTextfieldSchemaProps> = {},
): RenderResult => {
  return render(<StudioToggleableTextfieldSchema {...defaultProps} {...props} />);
};

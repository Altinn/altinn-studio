import type { JsonSchema } from '../../types/JSONSchema';
import React from 'react';
import {
  StudioToggleableTextfieldSchema,
  type StudioToggleableTextfieldSchemaProps,
} from './StudioToggleableTextfieldSchema';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

const defaultProps: StudioToggleableTextfieldSchemaProps = {
  layoutSchema: defaultLayoutSchemaMock,
  relatedSchemas: [],
  viewProps: {
    value: '',
    onChange: () => {},
  },
  inputProps: {
    value: '',
    onChange: () => {},
    icon: <div />,
  },
  propertyPath: 'definitions/component/properties/id',
  onError: jest.fn(),
};

describe('StudioToggleableTextfieldSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render as view mode as default and support rest props', () => {
    renderStudioTextfieldSchema({
      viewProps: {
        children: 'Edit id',
        className: 'test-class',
      },
    });
    const editButton = screen.getByRole('button', { name: 'Edit id' });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toHaveClass('test-class');
  });

  it('should toggle to edit mode when clicking edit', async () => {
    const user = userEvent.setup();

    renderStudioTextfieldSchema({
      viewProps: {
        children: 'Edit id',
      },
      inputProps: {
        ...defaultProps.inputProps,
        label: 'Your id',
      },
    });

    await act(() => user.click(screen.getByRole('button', { name: 'Edit id' })));
    expect(screen.getByLabelText('Your id')).toBeInTheDocument();
  });

  it('should toggle to view mode on blur', async () => {
    const user = userEvent.setup();

    renderStudioTextfieldSchema({
      viewProps: {
        children: 'Edit id',
      },
      inputProps: {
        ...defaultProps.inputProps,
        label: 'Your id',
      },
    });

    await act(() => user.click(screen.getByRole('button', { name: 'Edit id' })));
    expect(screen.queryByRole('button', { name: 'Edit id' })).not.toBeInTheDocument();

    fireEvent.blur(screen.getByLabelText('Your id'));
    expect(screen.getByRole('button', { name: 'Edit id' })).toBeInTheDocument();
  });

  it('should not toggle to view mode on blur if input is invalid', async () => {
    const user = userEvent.setup();

    renderStudioTextfieldSchema({
      viewProps: {
        children: 'Edit id',
      },
      inputProps: {
        ...defaultProps.inputProps,
        label: 'Your id',
        error: 'my awesome error message',
      },
    });

    await act(() => user.click(screen.getByRole('button', { name: 'Edit id' })));
    expect(screen.queryByRole('button', { name: 'Edit id' })).not.toBeInTheDocument();

    fireEvent.blur(screen.getByLabelText('Your id'));
    expect(screen.queryByRole('button', { name: 'Edit id' })).not.toBeInTheDocument();
  });

  it('should validate field against json schema and invoke "onError" if validation has errors', async () => {
    const user = userEvent.setup();

    renderStudioTextfieldSchema({
      viewProps: {
        children: 'Edit id',
      },
      inputProps: {
        ...defaultProps.inputProps,
        label: 'Your id',
      },
    });
    await act(() => user.click(screen.getByRole('button', { name: 'Edit id' })));

    await act(() => user.type(screen.getByLabelText('Your id'), 'invalid-value-01'));
    expect(defaultProps.onError).toHaveBeenCalledWith({
      errorCode: 'pattern',
      details: 'Result of validate property',
    });
  });

  it('should validate field against json schema and invoke "onError" if field is required', async () => {
    const user = userEvent.setup();

    renderStudioTextfieldSchema({
      viewProps: {
        children: 'Edit id',
      },
      inputProps: {
        ...defaultProps.inputProps,
        label: 'Your id',
      },
    });
    await act(() => user.click(screen.getByRole('button', { name: 'Edit id' })));

    await act(() => user.type(screen.getByLabelText('Your id'), 'first-id'));
    await act(() => user.clear(screen.getByLabelText('Your id')));

    expect(defaultProps.onError).toHaveBeenCalledWith({
      errorCode: 'required',
      details: 'Property value is required',
    });
  });

  it('should invoke onChange and onError when input changes with error', async () => {
    const user = userEvent.setup();
    const onErrorMock = jest.fn();
    const onChangeMock = jest.fn();

    renderStudioTextfieldSchema({
      onError: onErrorMock,
      viewProps: {
        children: 'Edit id',
      },
      inputProps: {
        ...defaultProps.inputProps,
        label: 'Your id',
        onChange: onChangeMock,
      },
    });

    await act(() => user.click(screen.getByRole('button', { name: 'Edit id' })));

    const invalidValue = '1';
    await act(() => user.type(screen.getByLabelText('Your id'), invalidValue));
    expect(onErrorMock).toHaveBeenCalledWith({
      details: 'Result of validate property',
      errorCode: 'pattern',
    });
    expect(onChangeMock).toHaveBeenCalledTimes(1);
  });
});

const renderStudioTextfieldSchema = (props: Partial<StudioToggleableTextfieldSchemaProps> = {}) => {
  return render(<StudioToggleableTextfieldSchema {...defaultProps} {...props} />);
};

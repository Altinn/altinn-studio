import React from 'react';
import { LegacyTextField } from '@digdir/design-system-react';
import { render as rtlRender, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField } from './FormField';
import type { FormFieldProps } from './FormField';
import { textMock } from '../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

const schema = {
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

const render = async (props: Partial<FormFieldProps<string, string>> = {}) => {
  const allProps = {
    value: '',
    ...props,
  };
  return rtlRender(
    <FormField
      {...allProps}
      renderField={({ fieldProps }) => (
        <LegacyTextField
          {...fieldProps}
          onChange={(event) => fieldProps.onChange(event.target.value, event)}
        />
      )}
    />,
  );
};

describe('FormField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders field with label and value', async () => {
    await render({
      label: 'test-label',
      value: 'test-value',
      onChange: mockOnChange,
    });

    expect(screen.getByText('test-label')).toBeInTheDocument();
    expect(screen.getByRole('textbox').getAttribute('value')).toBe('test-value');
  });

  it('should handle field change', async () => {
    await render({
      onChange: mockOnChange,
    });

    await act(async () => await user.type(screen.getByRole('textbox'), 'test'));
    expect(mockOnChange).toHaveBeenCalledTimes(4);
  });

  it('should return an error message when customRequired is set to true', async () => {
    await render({
      customRequired: true,
    });

    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('should validate field against custom rule and show a custom message', async () => {
    await render({
      value: 'test-value',
      customValidationRules: (value: string) => value === 'test-value' && 'test-rule',
      customValidationMessages: (errorType: string) =>
        errorType === 'test-rule' && textMock('test-message'),
    });

    expect(screen.getByText(textMock('test-message'))).toBeInTheDocument();
  });

  it('should validate field against json schema and show an error message', async () => {
    await render({
      onChange: mockOnChange,
      propertyPath: 'definitions/component/properties/id',
      schema,
    });

    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });
});

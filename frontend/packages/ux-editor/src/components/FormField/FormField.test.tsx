import React from 'react';
import {
  TextField,
} from '@digdir/design-system-react';
import { screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField } from './FormField';
import type { FormFieldProps } from './FormField';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { renderWithMockStore, renderHookWithMockStore } from '../../testing/mocks';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';

const user = userEvent.setup();

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery()).renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<FormFieldProps<string, string>> = {}) => {
  const allProps = {
    value: '',
    ...props,
  };
  await waitForData();
  return renderWithMockStore()(<FormField {...allProps}>{() => <TextField />}</FormField>);
}

describe('FormField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders field with label and value', async () => {
    await render({
      label: 'test-label',
      value: 'test-value',
      onChange: mockOnChange
    });

    expect(screen.getByText('test-label')).toBeInTheDocument();
    expect(screen.getByRole('textbox').getAttribute('value')).toBe('test-value');
  });

  it('should handle field change', async () => {
    await render({
      onChange: mockOnChange,
    });

    await act(() => user.type(screen.getByRole('textbox'), 'test'));
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
      customValidationMessages: (errorType: string) => errorType === 'test-rule' && textMock('test-message')
    });

    expect(screen.getByText(textMock('test-message'))).toBeInTheDocument();
  });

  it('should validate field against json schema and show an error message', async () => {
    await render({
      onChange: mockOnChange,
      propertyPath: 'definitions/component/properties/id'
    });

    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });
});

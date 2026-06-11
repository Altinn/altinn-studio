import type { MonthCaptionProps } from 'react-day-picker';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSONSchema7 } from 'json-schema';

import { DynamicForm } from './DynamicForm';

const NoopDropdownCaption = ({ calendarMonth }: MonthCaptionProps) => (
  <div>{calendarMonth.date.toISOString()}</div>
);

const baseProps = {
  DropdownCaption: NoopDropdownCaption,
  buttonAriaLabel: 'Open date picker',
  calendarIconTitle: 'Calendar',
  getDatepickerFormat: (format: string) => format,
};

describe('DynamicForm', () => {
  it('renders a string field with the property title as label', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        firstName: { type: 'string', title: 'First name' },
      },
    };

    render(<DynamicForm schema={schema} onChange={vi.fn()} {...baseProps} />);

    expect(screen.getByRole('textbox', { name: 'First name' })).toBeInTheDocument();
  });

  it('falls back to the property key when no title is provided', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        lastName: { type: 'string' },
      },
    };

    render(<DynamicForm schema={schema} onChange={vi.fn()} {...baseProps} />);

    expect(screen.getByRole('textbox', { name: 'lastName' })).toBeInTheDocument();
  });

  it('calls onChange with the updated value when the user edits a string field', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
      },
    };

    render(<DynamicForm schema={schema} onChange={onChange} {...baseProps} />);

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'a');

    expect(onChange).toHaveBeenLastCalledWith({ name: 'a' });
  });

  it('renders a number field that emits numeric values', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        age: { type: 'number', title: 'Age' },
      },
    };

    render(<DynamicForm schema={schema} onChange={onChange} {...baseProps} />);

    await user.type(screen.getByRole('spinbutton', { name: 'Age' }), '7');

    expect(onChange).toHaveBeenLastCalledWith({ age: 7 });
  });

  it('renders a boolean field as a checkbox', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        agreed: { type: 'boolean', title: 'I agree' },
      },
    };

    render(<DynamicForm schema={schema} onChange={onChange} {...baseProps} />);

    await user.click(screen.getByRole('checkbox', { name: 'I agree' }));

    expect(onChange).toHaveBeenLastCalledWith({ agreed: true });
  });

  it('marks required fields on the rendered input', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', title: 'Email' },
      },
    };

    render(<DynamicForm schema={schema} onChange={vi.fn()} {...baseProps} />);

    expect(screen.getByRole('textbox', { name: /Email/ })).toBeRequired();
  });

  it('renders enum options as a select with the provided choices', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        color: { type: 'string', title: 'Color', enum: ['red', 'blue'] },
      },
    };

    render(<DynamicForm schema={schema} onChange={vi.fn()} {...baseProps} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'red' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'blue' })).toBeInTheDocument();
  });

  it('recursively renders nested object schemas inside a fieldset', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          title: 'Address',
          properties: {
            street: { type: 'string', title: 'Street' },
          },
        },
      },
    };

    render(<DynamicForm schema={schema} onChange={vi.fn()} {...baseProps} />);

    expect(screen.getByRole('group', { name: 'Address' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Street' })).toBeInTheDocument();
  });

  it('uses the initial data to populate field values', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
      },
    };

    render(
      <DynamicForm
        schema={schema}
        onChange={vi.fn()}
        initialData={{ name: 'Ada' }}
        {...baseProps}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada');
  });
});

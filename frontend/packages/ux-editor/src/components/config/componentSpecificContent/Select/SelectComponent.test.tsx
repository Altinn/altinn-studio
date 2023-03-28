import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SelectComponentProps } from './SelectComponent';
import { SelectComponent } from './SelectComponent';

const renderSelectComponent = ({
  label,
  defaultValue,
  component,
  optionKey,
  options,
  handleComponentChange,
}: Partial<SelectComponentProps>) => {
  const user = userEvent.setup();

  render(
    <SelectComponent
      label={label}
      defaultValue={defaultValue}
      component={component}
      optionKey={optionKey}
      options={options}
      handleComponentChange={handleComponentChange}
    />
  );

  return { user };
};

describe('SelectComponent', () => {
  test('should render SelectComponent with label and 3 options', async () => {
    const { user } = renderSelectComponent({
      label: 'Choose variant',
      optionKey: 'variant',
      options: [
        {
          label: 'Success',
          value: 'success',
        },
        {
          label: 'Error',
          value: 'error',
        },
        {
          label: 'Warning',
          value: 'warning',
        },
      ],
    });

    expect(screen.getByLabelText('Choose variant')).toBeInTheDocument();

    await act(() => user.click(screen.getByRole('combobox')));
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  test('should be able to select option "small" and the "optionKey" should be "size"', async () => {
    const onSelectChange = jest.fn();
    const { user } = renderSelectComponent({
      label: 'Choose size',
      optionKey: 'size',
      options: [
        {
          label: 'Small',
          value: 'sm',
        },
        {
          label: 'Medium',
          value: 'md',
        },
        {
          label: 'Large',
          value: 'lg',
        },
      ],
      handleComponentChange: onSelectChange,
    });

    await act(() => user.click(screen.getByRole('combobox')));
    await act(() => user.click(screen.getByRole('option', { name: 'Small' })));
    expect(onSelectChange).toHaveBeenCalledWith({ size: 'sm' });
  });

  test('should render with "defaultValue" medium', async () => {
    renderSelectComponent({
      label: 'Choose size',
      optionKey: 'size',
      defaultValue: 'md',
      options: [
        {
          label: 'Small',
          value: 'sm',
        },
        {
          label: 'Medium',
          value: 'md',
        },
        {
          label: 'Large',
          value: 'lg',
        },
      ],
      handleComponentChange: () => {},
    });

    expect(screen.getByRole('combobox')).toHaveValue('md');
  });
});

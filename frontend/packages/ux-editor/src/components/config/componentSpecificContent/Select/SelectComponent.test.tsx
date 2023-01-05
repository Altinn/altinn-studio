import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectComponent, SelectComponentProps } from './SelectComponent';

const renderSelectComponent = ({
  component,
  optionKey,
  options,
  handleComponentChange
}: Partial<SelectComponentProps>) => {
  const user = userEvent.setup();

  render(
    <SelectComponent
      component={component}
      optionKey={optionKey}
      options={options}
      handleComponentChange={handleComponentChange}
    />
  );

  return { user };
};

test('should render SelectComponent with 3 options', async () => {
  const { user } = renderSelectComponent({
    optionKey: 'variant',
    options: ['success', 'error', 'warning']
  });

  await user.click(screen.getByRole('combobox'));
  expect(screen.getAllByRole('option')).toHaveLength(3);
});

test('should be able to select option "small" and the "optionKey" should be "size"', async () => {
  const onSelectChange = jest.fn();
  const { user } = renderSelectComponent({
    optionKey: 'size',
    options: ['small', 'medium', 'large'],
    handleComponentChange: onSelectChange
  });

  await user.click(screen.getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: 'small' }));
  expect(onSelectChange).toHaveBeenCalledWith({ size: 'small' });
});

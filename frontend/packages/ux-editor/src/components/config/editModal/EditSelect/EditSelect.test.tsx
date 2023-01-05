import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditSelect, EditSelectProps } from './EditSelect';

const renderEditSelect = ({
  component,
  optionKey,
  options,
  handleComponentChange
}: Partial<EditSelectProps>) => {
  const user = userEvent.setup();

  render(
    <EditSelect
      component={component}
      optionKey={optionKey}
      options={options}
      handleComponentChange={handleComponentChange}
    />
  );

  return { user };
};

test('should render EditSelect with 3 options', async () => {
  const { user } = renderEditSelect({
    optionKey: 'variant',
    options: ['success', 'error', 'waring']
  });

  await user.click(screen.getByRole('combobox'));
  expect(screen.getAllByRole('option')).toHaveLength(3);
});

test('should be able to select a option "small" and the option key should be "size"', async () => {
  const onSelectChange = jest.fn();
  const { user } = renderEditSelect({
    optionKey: 'size',
    options: ['small', 'medium', 'large'],
    handleComponentChange: onSelectChange
  });

  await user.click(screen.getByRole('combobox'));
  await user.click(screen.getByRole('option', { name: 'small' }));
  expect(onSelectChange).toHaveBeenCalledWith({ size: 'small' });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckboxComponent, CheckboxComponentProps } from './CheckboxComponent';

const renderCheckboxComponent = ({
  label,
  component,
  defaultValue,
  onChangeKey,
  handleComponentChange
}: Partial<CheckboxComponentProps>) => {
  const user = userEvent.setup();

  render(
    <CheckboxComponent
      label={label}
      defaultValue={defaultValue}
      component={component}
      onChangeKey={onChangeKey}
      handleComponentChange={handleComponentChange}
    />
  );

  return { user };
};

test('should render CheckboxComponent with label and should not be checked as default', async () => {
  renderCheckboxComponent({
    label: 'Should icon be displayed?',
    onChangeKey: 'showIcon',
    handleComponentChange: () => {}
  });

  const checkboxLabel = screen.getByLabelText('Should icon be displayed?');
  expect(checkboxLabel).not.toBeChecked();
});

test('should be able to toggle show icon and "onChangeKey" should be "showIcon"', async () => {
  const onCheckboxChanged = jest.fn();
  const { user } = renderCheckboxComponent({
    label: 'Should icon be displayed?',
    onChangeKey: 'showIcon',
    handleComponentChange: onCheckboxChanged
  });

  const checkboxLabel = screen.getByLabelText('Should icon be displayed?');

  await user.click(checkboxLabel);
  expect(checkboxLabel).toBeChecked();
  expect(onCheckboxChanged).toHaveBeenCalledWith({ showIcon: true });
});

test('should be able to set defaultValue', () => {
  renderCheckboxComponent({
    label: 'Should icon be displayed?',
    onChangeKey: 'showIcon',
    defaultValue: true,
    handleComponentChange: () => {}
  });

  const checkboxLabel = screen.getByLabelText('Should icon be displayed?');
  expect(checkboxLabel).toBeChecked();
});

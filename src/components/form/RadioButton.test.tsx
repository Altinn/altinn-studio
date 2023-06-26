import React from 'react';

import { render as renderRTL, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RadioButton } from 'src/components/form/RadioButton';
import type { IRadioButtonProps } from 'src/components/form/RadioButton';

const defaultProps: IRadioButtonProps = {
  name: 'radio-name',
  value: 'radio-value',
  onChange: jest.fn(),
};

const ControlledRadioGroup = (props: Partial<IRadioButtonProps> = {}) => {
  const [value, setValue] = React.useState<string | undefined>(undefined);

  return (
    <RadioButton
      {...defaultProps}
      {...props}
      radioId='radio-id-1'
      label='radio button 1'
      checked={value === 'radio-value'}
      onChange={(event) => setValue(event.target.value)}
    />
  );
};

const render = (props: Partial<IRadioButtonProps> = {}) =>
  renderRTL(
    <RadioButton
      {...defaultProps}
      {...props}
    />,
  );

describe('RadioButton', () => {
  it('should render RadioButton with correct label', () => {
    render({ label: 'Dette er en knapp' });

    expect(screen.getByRole('radio', { name: /dette er en knapp/i })).toBeInTheDocument();
  });

  it('should focus the inner input element when clicking the "card" surrounding the radio button focus', async () => {
    render({ label: 'Dette er en knapp', showAsCard: true });

    await userEvent.click(screen.getByTestId('test-id-Dette er en knapp'));

    expect(screen.getByRole('radio')).toHaveFocus();
  });

  it('should click the inner input element when clicking the "card" surrounding the radio button', async () => {
    renderRTL(<ControlledRadioGroup showAsCard={true} />);

    expect(screen.getByRole('radio', { name: /radio button 1/i })).not.toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: /radio button 1/i }));

    await waitFor(() => expect(screen.getByRole('radio', { name: /radio button 1/i })).toBeChecked());
  });
});

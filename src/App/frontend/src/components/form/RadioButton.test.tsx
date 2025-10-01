import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { RadioButton } from 'src/components/form/RadioButton';
import { renderWithMinimalProviders } from 'src/test/renderWithProviders';
import type { IRadioButtonProps } from 'src/components/form/RadioButton';

const defaultProps = {
  name: 'radio-name',
  value: 'radio-value',
  onChange: jest.fn(),
};

const ControlledRadioButton = (props: Partial<IRadioButtonProps> = {}) => {
  const [value, setValue] = React.useState<string | undefined>(undefined);

  return (
    <RadioButton
      {...defaultProps}
      {...props}
      id='radio-id-1'
      label='radio button 1'
      checked={value === 'radio-value'}
      onChange={(event) => setValue(event.target.value)}
    />
  );
};

const render = async (props: Partial<IRadioButtonProps> = {}) =>
  await renderWithMinimalProviders({
    renderer: () => (
      <RadioButton
        {...defaultProps}
        {...props}
      />
    ),
  });

describe('RadioButton', () => {
  it('should render RadioButton with correct label', async () => {
    await render({ label: 'Dette er en knapp' });

    expect(screen.getByRole('radio', { name: /Dette er en knapp/ })).toBeInTheDocument();
  });
  it('should render with helperText', async () => {
    await render({ label: 'Dette er en knapp', helpText: 'Hjelpetekst: trykk på knappen' });

    expect(screen.getByRole('radio', { name: /Dette er en knapp/ })).toBeInTheDocument();
    const helpTextButton = screen.getByRole('button', { name: /Hjelpetekst: trykk på knappen/i });
    expect(helpTextButton).toBeVisible();
    await userEvent.click(helpTextButton);
    expect(screen.getByRole('button', { name: 'Hjelpetekst: trykk på knappen' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
  it('should render with hidden label', async () => {
    await render({ label: 'Dette er en knapp', hideLabel: true });

    expect(screen.getByRole('radio', { name: /Dette er en knapp/ })).toBeInTheDocument();
    expect(screen.getByText('Dette er en knapp')).toHaveClass('sr-only');
  });

  it('should focus the inner input element when clicking the "card" surrounding the radio button focus', async () => {
    await render({ label: 'Dette er en knapp', showAsCard: true });

    await userEvent.click(screen.getByTestId('test-id-Dette er en knapp'));

    expect(screen.getByRole('radio')).toBeChecked();
  });

  it('should click the inner input element when clicking the description', async () => {
    await renderWithMinimalProviders({
      renderer: () => (
        <ControlledRadioButton
          showAsCard={true}
          description='Beskrivelsen'
        />
      ),
    });

    expect(screen.getByRole('radio', { name: /radio button 1/i })).not.toBeChecked();

    await userEvent.click(screen.getByText('Beskrivelsen'));

    expect(screen.getByRole('radio', { name: /radio button 1/i })).toBeChecked();
  });
});

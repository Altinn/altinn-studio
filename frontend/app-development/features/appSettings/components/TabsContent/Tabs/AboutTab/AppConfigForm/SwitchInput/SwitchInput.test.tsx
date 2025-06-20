import React from 'react';
import { render, screen } from '@testing-library/react';
import { SwitchInput } from './SwitchInput';
import type { SwitchInputProps } from './SwitchInput';
import { userEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('SwitchInput', () => {
  afterEach(jest.clearAllMocks);

  it('renders heading, description and required tag when required is true', () => {
    renderSwitchInput({ required: true });

    expect(getText(cardHeading)).toBeInTheDocument();
    expect(getText(description)).toBeInTheDocument();
    expect(getText(required)).toBeInTheDocument();

    const switchElement = getSwitch();
    expect(switchElement).toHaveAccessibleName(ariaLabel);
  });

  it('renders optional tag when required is false', () => {
    renderSwitchInput({ required: false });

    expect(getText(optional)).toBeInTheDocument();
  });

  it('reflects the checked state of the switch', () => {
    renderSwitchInput({ checked: true });

    const toggle: HTMLInputElement = getSwitch();
    expect(toggle).toBeChecked();
  });

  it('reflects the unchecked state of the switch', () => {
    renderSwitchInput({ checked: false });

    const toggle: HTMLInputElement = getSwitch();
    expect(toggle).not.toBeChecked();
  });

  it('calls onChange when switch is toggled', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSwitchInput({ onChange });

    const toggle: HTMLInputElement = getSwitch();
    await user.click(toggle);

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

const cardHeading = textMock('card_heading');
const description = textMock('card_description');
const required = textMock('general.required');
const optional = textMock('general.optional');
const ariaLabel = textMock('switch_aria_label');

const defaultProps: SwitchInputProps = {
  switchAriaLabel: ariaLabel,
  cardHeading,
  description,
  checked: false,
  onChange: jest.fn(),
  required: true,
};

function renderSwitchInput(props: Partial<SwitchInputProps> = {}) {
  return render(<SwitchInput {...defaultProps} {...props} />);
}

const getSwitch = (): HTMLInputElement => screen.getByRole('switch', { name: ariaLabel });
const getText = (text: string): HTMLElement => screen.getByText(text);

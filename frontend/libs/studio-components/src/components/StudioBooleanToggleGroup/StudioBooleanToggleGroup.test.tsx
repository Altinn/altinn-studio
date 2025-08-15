import type { ForwardedRef } from 'react';
import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen, within } from '@testing-library/react';
import type { StudioBooleanToggleGroupProps } from './StudioBooleanToggleGroup';
import { StudioBooleanToggleGroup } from './StudioBooleanToggleGroup';
import userEvent from '@testing-library/user-event';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

// Test data:
const trueLabel = 'True';
const falseLabel = 'False';
const defaultProps: StudioBooleanToggleGroupProps = {
  trueLabel,
  falseLabel,
};

describe('StudioBooleanToggleGroup', () => {
  it('Renders a toggle group with toggles with the given labels', () => {
    renderBooleanToggle();
    const withinRadioGroup = (): ReturnType<typeof within> =>
      within(screen.getByRole('radiogroup'));
    expect(withinRadioGroup().getByRole('radio', { name: trueLabel })).toBeInTheDocument();
    expect(withinRadioGroup().getByRole('radio', { name: falseLabel })).toBeInTheDocument();
  });

  it('Renders with the false toggle checked as default', () => {
    renderBooleanToggle();
    expect(getFalseToggle()).toBeChecked();
    expect(getTrueToggle()).not.toBeChecked();
  });

  it('Renders with the true toggle checked when value is true', () => {
    renderBooleanToggle({ value: true });
    expect(getTrueToggle()).toBeChecked();
    expect(getFalseToggle()).not.toBeChecked();
  });

  it('Renders with the false toggle checked when value is false', () => {
    renderBooleanToggle({ value: false });
    expect(getFalseToggle()).toBeChecked();
    expect(getTrueToggle()).not.toBeChecked();
  });

  it('Calls the onChange callback with true when the user checks the true toggle', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderBooleanToggle({ onChange, value: false });
    await user.click(getTrueToggle());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Switches the toggle when the user checks the true toggle', async () => {
    const user = userEvent.setup();
    renderBooleanToggle({ value: false });
    await user.click(getTrueToggle());
    expect(getTrueToggle()).toBeChecked();
    expect(getFalseToggle()).not.toBeChecked();
  });

  it('Calls the onChange callback with false when the user checks the false toggle', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderBooleanToggle({ onChange, value: true });
    await user.click(getFalseToggle());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('Switches the toggle when the user checks the false toggle', async () => {
    const user = userEvent.setup();
    renderBooleanToggle({ value: true });
    await user.click(getFalseToggle());
    expect(getFalseToggle()).toBeChecked();
    expect(getTrueToggle()).not.toBeChecked();
  });

  it('Updates the value when the value prop changes', () => {
    const { rerender } = renderBooleanToggle({ value: true });
    expect(getTrueToggle()).toBeChecked();
    rerender(<StudioBooleanToggleGroup {...defaultProps} value={false} />);
    expect(getFalseToggle()).toBeChecked();
    rerender(<StudioBooleanToggleGroup {...defaultProps} value={true} />);
    expect(getTrueToggle()).toBeChecked();
  });

  it('Forwards the ref object to the toggle group element if given', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderBooleanToggle({}, ref));
  });

  const getTrueToggle = (): HTMLElement => screen.getByRole('radio', { name: trueLabel });
  const getFalseToggle = (): HTMLElement => screen.getByRole('radio', { name: falseLabel });
});

function renderBooleanToggle(
  props: Partial<StudioBooleanToggleGroupProps> = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult {
  return render(<StudioBooleanToggleGroup {...defaultProps} {...props} ref={ref} />);
}

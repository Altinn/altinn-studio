import type { RefObject } from 'react';
import React, { createRef } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import type { StudioBooleanToggleGroupProps } from './StudioBooleanToggleGroup';
import { StudioBooleanToggleGroup } from './StudioBooleanToggleGroup';
import userEvent from '@testing-library/user-event';

describe('StudioBooleanToggleGroup', () => {
  it('Renders a toggle group with toggles with the given labels', () => {
    renderBooleanToggle();
    const withinRadioGroup = () => within(screen.getByRole('radiogroup'));
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
    await act(() => user.click(getTrueToggle()));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Switches the toggle when the user checks the true toggle', async () => {
    const user = userEvent.setup();
    renderBooleanToggle({ value: false });
    await act(() => user.click(getTrueToggle()));
    expect(getTrueToggle()).toBeChecked();
    expect(getFalseToggle()).not.toBeChecked();
  });

  it('Calls the onChange callback with false when the user checks the false toggle', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderBooleanToggle({ onChange, value: true });
    await act(() => user.click(getFalseToggle()));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('Switches the toggle when the user checks the false toggle', async () => {
    const user = userEvent.setup();
    renderBooleanToggle({ value: true });
    await act(() => user.click(getFalseToggle()));
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
    const ref = createRef<HTMLDivElement>();
    const { container } = renderBooleanToggle({}, ref);
    expect(ref.current).toBe(container.firstChild); // eslint-disable-line testing-library/no-node-access
  });

  const getTrueToggle = () => screen.getByRole('radio', { name: trueLabel });
  const getFalseToggle = () => screen.getByRole('radio', { name: falseLabel });
});

const trueLabel = 'True';
const falseLabel = 'False';
const defaultProps: StudioBooleanToggleGroupProps = {
  trueLabel,
  falseLabel,
};

const renderBooleanToggle = (
  props: Partial<StudioBooleanToggleGroupProps> = {},
  ref?: RefObject<HTMLDivElement>,
) => render(<StudioBooleanToggleGroup {...defaultProps} {...props} ref={ref} />);

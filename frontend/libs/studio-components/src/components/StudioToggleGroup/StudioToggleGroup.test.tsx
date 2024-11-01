import React, { ForwardedRef } from 'react';
import { render, RenderResult, screen } from '@testing-library/react';
import { StudioToggleGroup, StudioToggleGroupProps } from './';

// Test data:
const item1Value = 'item1';
const item1Label = 'Item 1';
const item2Value = 'item2';
const item2Label = 'Item 2';
const item3Value = 'item3';
const item3Label = 'Item 3';
const defaultProps: StudioToggleGroupProps = {
  children: (
    <>
      <StudioToggleGroup.Item value={item1Value}>{item1Label}</StudioToggleGroup.Item>
      <StudioToggleGroup.Item value={item2Value}>{item2Label}</StudioToggleGroup.Item>
      <StudioToggleGroup.Item value={item3Value}>{item3Label}</StudioToggleGroup.Item>
    </>
  ),
};

describe('StudioToggleGroup', () => {
  it('Renders a toggle group', () => {
    renderToggleGroup();
    expect(getToggleGroup()).toBeInTheDocument();
  });

  it('Renders the toggle buttons', () => {
    renderToggleGroup();
    expect(screen.getByRole('radio', { name: item1Label })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: item2Label })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: item3Label })).toBeInTheDocument();
  });
});

function renderToggleGroup(
  props: Partial<StudioToggleGroupProps>,
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult {
  render(<StudioToggleGroup {...defaultProps} {...props} ref={ref} />);
}

function getToggleGroup(): HTMLDivElement {
  return screen.getByRole('radiogroup') as HTMLDivElement;
}

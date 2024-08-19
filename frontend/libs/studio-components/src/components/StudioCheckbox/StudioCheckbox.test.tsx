import { render, screen } from '@testing-library/react';
import { StudioCheckbox } from './index';
import type { RefObject } from 'react';
import React, { createRef } from 'react';
import type { StudioCheckboxProps } from './StudioCheckbox';

// Test data:
const value = 'Test';
const defaultProps: StudioCheckboxProps = { value };

describe('StudioCheckbox', () => {
  it('Renders a checkbox', () => {
    renderCheckbox();
    getCheckbox();
  });

  it('Forwards the ref object to the input element if given', () => {
    const ref = createRef<HTMLInputElement>();
    renderCheckbox({}, ref);
    expect(ref.current).toBe(getCheckbox());
  });

  it('Forwards props', () => {
    renderCheckbox({ checked: true });
    expect(getCheckbox()).toBeChecked();
  });
});

function renderCheckbox(
  props: Partial<StudioCheckboxProps> = {},
  ref?: RefObject<HTMLInputElement>,
) {
  render(<StudioCheckbox {...defaultProps} {...props} ref={ref} />);
}

const getCheckbox = () => screen.getByRole('checkbox');

import type { StudioCheckboxGroupProps } from './index';
import { StudioCheckbox } from './index';
import type { ForwardedRef } from 'react';
import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

// Test data:
const legend = 'Checkbox group';
const values = ['checkbox1', 'checkbox2'];
const labels = ['Checkbox 1', 'Checkbox 2'];
const defaultProps: StudioCheckboxGroupProps = { legend };

describe('StudioCheckboxGroup', () => {
  it('Renders a checkbox group', () => {
    renderCheckboxGroup();
    expect(getCheckboxGroup()).toBeInTheDocument();
  });

  it('Renders with the given legend', () => {
    renderCheckboxGroup();
    expect(getCheckboxGroup()).toHaveAccessibleName(legend);
  });

  it('Forwards the ref', () => {
    testRefForwarding<HTMLFieldSetElement>((ref) => renderCheckboxGroup({}, ref), getCheckboxGroup);
  });

  it('Appends custom attributes', () => {
    testCustomAttributes<HTMLFieldSetElement, Omit<StudioCheckboxGroupProps, 'onChange'>>(
      renderCheckboxGroup,
      getCheckboxGroup,
    );
  });

  it('Appends the given class name to the root element', () => {
    testRootClassNameAppending((className) => renderCheckboxGroup({ className }));
  });

  it('Renders the child checkboxes', () => {
    renderCheckboxGroup();
    expect(screen.getByRole('checkbox', { name: labels[0] })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: labels[1] })).toBeInTheDocument();
  });
});

function renderCheckboxGroup(
  props: Partial<StudioCheckboxGroupProps> = {},
  ref?: ForwardedRef<HTMLFieldSetElement>,
): RenderResult {
  return render(
    <StudioCheckbox.Group {...defaultProps} {...props} ref={ref}>
      <StudioCheckbox value={values[0]}>{labels[0]}</StudioCheckbox>
      <StudioCheckbox value={values[1]}>{labels[1]}</StudioCheckbox>
    </StudioCheckbox.Group>,
  );
}

function getCheckboxGroup(): HTMLFieldSetElement {
  return screen.getByRole('group');
}

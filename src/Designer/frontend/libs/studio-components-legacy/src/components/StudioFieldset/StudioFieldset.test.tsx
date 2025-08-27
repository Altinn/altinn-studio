import type { ForwardedRef } from 'react';
import type { StudioFieldsetProps } from './StudioFieldset';
import { StudioFieldset } from './StudioFieldset';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

// Test data:
const legend = 'Test legend';
const defaultProps: StudioFieldsetProps = { legend };

describe('StudioFieldset', () => {
  it('Renders a fieldset with the given legend', () => {
    renderFieldset();
    expect(getFieldset()).toBeInTheDocument();
  });

  it('Forwards the ref to the fieldset element if given', () => {
    testRefForwarding<HTMLFieldSetElement>((ref) => renderFieldset({}, ref), getFieldset);
  });

  it('Sets the given className on the root element', () => {
    testRootClassNameAppending((className) => renderFieldset({ className }));
  });

  it('Appends custom attributes to the fieldset element', () => {
    testCustomAttributes<HTMLFieldSetElement, StudioFieldsetProps>(renderFieldset, getFieldset);
  });
});

function renderFieldset(
  props: Partial<StudioFieldsetProps> = {},
  ref?: ForwardedRef<HTMLFieldSetElement>,
): RenderResult {
  return render(<StudioFieldset {...defaultProps} {...props} ref={ref} />);
}

function getFieldset(): HTMLFieldSetElement {
  return screen.getByRole('group', { name: legend });
}

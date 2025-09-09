import React from 'react';
import type { ForwardedRef } from 'react';
import type { StudioFieldsetProps } from './';
import { StudioFieldset } from './';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioFieldset', () => {
  it('Forwards the ref to the fieldset element if given', () => {
    testRefForwarding<HTMLFieldSetElement>((ref) => renderFieldset({}, ref));
  });

  it('Sets the given className on the root element', () => {
    testRootClassNameAppending((className) => renderFieldset({ className }));
  });

  it('Appends custom attributes to the fieldset element', () => {
    testCustomAttributes(renderFieldset);
  });

  it('Renders a group element connected to the given legend', () => {
    renderFieldset();
    expect(screen.getByRole('group')).toHaveAccessibleName(legend);
  });

  it('Renders the description ', () => {
    const description: string = 'This is a description';
    renderFieldset({ description });
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('Renders with the withHiddenLegend class when hideLegend is true', () => {
    renderFieldset({ hideLegend: true });
    expect(screen.getByRole('group')).toHaveClass('withHiddenLegend');
  });

  it.each([false, undefined])(
    'Does not render with the withHiddenLegend class when hideLegend is %s',
    (hideLegend) => {
      renderFieldset({ hideLegend });
      expect(screen.getByRole('group')).not.toHaveClass('withHiddenLegend');
    },
  );
});

const legend: string = 'Legend';
const defaultProps: StudioFieldsetProps = { legend };

function renderFieldset(
  props: Partial<StudioFieldsetProps> = {},
  ref?: ForwardedRef<HTMLFieldSetElement>,
): RenderResult {
  return render(<StudioFieldset {...defaultProps} {...props} ref={ref} />);
}

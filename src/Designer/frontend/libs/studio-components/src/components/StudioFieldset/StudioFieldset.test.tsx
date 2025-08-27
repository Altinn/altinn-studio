import React from 'react';
import type { ForwardedRef } from 'react';
import type { StudioFieldsetProps } from './index';
import { StudioFieldset } from './index';
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

  it('Renders the legend ', () => {
    renderFieldset();
    expect(screen.getByText(legend)).toBeInTheDocument();
  });

  it('Renders the description ', () => {
    const description: string = 'This is a description';
    renderFieldset({ description });
    expect(screen.getByText(description)).toBeInTheDocument();
  });
});

const legend: string = 'Legend';
const defaultProps: StudioFieldsetProps = { legend };

function renderFieldset(
  props: Partial<StudioFieldsetProps> = {},
  ref?: ForwardedRef<HTMLFieldSetElement>,
): RenderResult {
  return render(<StudioFieldset {...defaultProps} {...props} ref={ref} />);
}

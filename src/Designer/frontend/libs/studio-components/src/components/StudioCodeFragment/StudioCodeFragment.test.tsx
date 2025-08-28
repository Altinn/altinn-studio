import React from 'react';
import type { Ref } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioCodeFragment } from './StudioCodeFragment';
import type { StudioCodeFragmentProps } from './StudioCodeFragment';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

describe('StudioCodeFragment', () => {
  it('appends custom attributes to the element', () => {
    testCustomAttributes(renderCodeFragment);
  });

  it('appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderCodeFragment({ className }));
  });

  it('forwards the ref object to the code element if given', () => {
    testRefForwarding<HTMLElement>((ref) => renderCodeFragment({}, ref));
  });

  it('renders children', () => {
    const children = 'Test';
    renderCodeFragment({ children });
    expect(screen.getByText(children)).toBeInTheDocument();
  });
});

const renderCodeFragment = (
  props: StudioCodeFragmentProps = {},
  ref?: Ref<HTMLElement>,
): RenderResult => render(<StudioCodeFragment {...props} ref={ref} />);

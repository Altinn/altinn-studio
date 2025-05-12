import React from 'react';
import type { ForwardedRef } from 'react';
import type { StudioFieldsetProps } from './StudioFieldset';
import { StudioFieldset } from './StudioFieldset';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
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
});

function renderFieldset(
  props: Partial<StudioFieldsetProps> = {},
  ref?: ForwardedRef<HTMLFieldSetElement>,
): RenderResult {
  return render(<StudioFieldset {...props} ref={ref} />);
}

import React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioSpinner } from './StudioSpinner';
import type { StudioSpinnerProps } from './StudioSpinner';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioSpinner', () => {
  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioSpinner({ className }));
  });

  it('Appends custom attributes to the spinner element', () => {
    testCustomAttributes(renderStudioSpinner);
  });
});

const defaultProps: StudioSpinnerProps = {
  'aria-label': 'Loading',
  'aria-hidden': true,
  'data-size': 'md',
};

const renderStudioSpinner = (props: Partial<StudioSpinnerProps>): RenderResult => {
  return render(<StudioSpinner {...defaultProps} {...props} />);
};

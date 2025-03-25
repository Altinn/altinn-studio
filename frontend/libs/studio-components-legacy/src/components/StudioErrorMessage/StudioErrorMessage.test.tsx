import type { ForwardedRef } from 'react';
import React from 'react';
import type { StudioErrorMessageProps } from './StudioErrorMessage';
import { StudioErrorMessage } from './StudioErrorMessage';
import { render, screen } from '@testing-library/react';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

// Test data:
const errorMessage = 'Test error message';
const defaultProps: StudioErrorMessageProps = { children: errorMessage };

describe('StudioErrorMessage', () => {
  it('Renders the given error message', () => {
    renderErrorMessage();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('Forwards the ref', () => {
    testRefForwarding<HTMLParagraphElement>((ref) => renderErrorMessage({}, ref));
  });

  it('Accepts custom attributes', () => {
    testCustomAttributes<HTMLParagraphElement>(renderErrorMessage);
  });

  it('Applies the class name to the root element', () => {
    testRootClassNameAppending((className) => renderErrorMessage({ className }));
  });
});

const renderErrorMessage = (
  props: StudioErrorMessageProps = {},
  ref?: ForwardedRef<HTMLParagraphElement>,
) => render(<StudioErrorMessage {...defaultProps} {...props} ref={ref} />);

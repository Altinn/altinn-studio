import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { defaultAriaLabel, StudioBetaTag, StudioBetaTagProps } from './StudioBetaTag';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

describe('StudioBetaTag', () => {
  it('should render the "Beta" text', () => {
    renderStudioBetaTag();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('should render with isBeta className', () => {
    renderStudioBetaTag();
    expect(screen.getByText('Beta')).toHaveClass('isBeta');
  });

  it('should render with a default aria label', () => {
    renderStudioBetaTag();
    expect(screen.getByText('Beta')).toHaveAttribute('aria-label', defaultAriaLabel);
  });

  it('should render with a custom aria label', () => {
    const customAriaLabel = 'customAriaLabel';
    renderStudioBetaTag({ 'aria-label': customAriaLabel });
    expect(screen.getByText('Beta')).toHaveAttribute('aria-label', customAriaLabel);
  });

  it('Appends given classname to the component', () => {
    testRootClassNameAppending((className) => renderStudioBetaTag({ className }));
  });
});

const renderStudioBetaTag = (props: Partial<StudioBetaTagProps> = {}): RenderResult => {
  return render(<StudioBetaTag {...props} />);
};

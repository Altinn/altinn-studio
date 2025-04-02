import React from 'react';
import { render, type RenderResult, screen } from '@testing-library/react';
import { StudioHeading, type StudioHeadingProps } from './StudioHeading';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const headingText: string = 'Test Heading';
const defaultProps: StudioHeadingProps = {
  children: headingText,
};

describe('StudioHeading', () => {
  it('renders children correctly', () => {
    renderStudioHeading();
    expect(getHeading(headingText)).toBeInTheDocument();
  });

  it('applies custom data-size correctly', () => {
    renderStudioHeading({ 'data-size': 'lg' });
    expect(getHeading(headingText).getAttribute('data-size')).toBe('lg');
  });

  it('applies custom level prop correctly', () => {
    renderStudioHeading({ level: 1 });
    expect(getHeading(headingText, 1)).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioHeading({ className }));
  });

  it('Appends custom attributes to the heading element', () => {
    testCustomAttributes(renderStudioHeading);
  });
});

const renderStudioHeading = (props: Partial<StudioHeadingProps> = {}): RenderResult => {
  return render(<StudioHeading {...defaultProps} {...props} />);
};

const getHeading = (name: string, level?: number): HTMLElement =>
  screen.getByRole('heading', { name, level });

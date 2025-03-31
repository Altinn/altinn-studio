import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioLabel, type StudioLabelProps } from './StudioLabel';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const mockLabel: string = 'Test Label';

describe('StudioLabel', () => {
  it('renders children correctly', () => {
    renderStudioLabel();
    expect(getText(mockLabel)).toBeInTheDocument();
  });

  it('applies custom data-size correctly', () => {
    renderStudioLabel({ 'data-size': 'lg' });

    expect(getText(mockLabel).getAttribute('data-size')).toBe('lg');
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioLabel({ className }));
  });

  it('Appends custom attributes to the label element', () => {
    testCustomAttributes(renderStudioLabel);
  });
});

const renderStudioLabel = (props: Partial<StudioLabelProps> = {}): RenderResult => {
  return render(<StudioLabel {...props}>{mockLabel}</StudioLabel>);
};

const getText = (text: string): HTMLElement => screen.getByText(text);

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioParagraph, type StudioParagraphProps } from './StudioParagraph';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const mockText: string = 'Test Paragraph';

describe('StudioParagraph', () => {
  it('renders children correctly', () => {
    renderStudioParagraph();
    expect(getText(mockText)).toBeInTheDocument();
  });

  it('applies custom data-size correctly', () => {
    renderStudioParagraph({ 'data-size': 'lg' });

    expect(getText(mockText).getAttribute('data-size')).toBe('lg');
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioParagraph({ className }));
  });

  it('Appends custom attributes to the paragraph element', () => {
    testCustomAttributes(renderStudioParagraph);
  });
});

const renderStudioParagraph = (props: Partial<StudioParagraphProps> = {}): RenderResult => {
  return render(<StudioParagraph {...props}>{mockText}</StudioParagraph>);
};

const getText = (text: string): HTMLElement => screen.getByText(text) as HTMLElement;

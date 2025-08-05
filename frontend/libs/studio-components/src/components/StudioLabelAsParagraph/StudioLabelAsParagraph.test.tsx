import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioLabelAsParagraph } from './StudioLabelAsParagraph';
import type { StudioLabelAsParagraphProps } from './StudioLabelAsParagraph';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const mockText: string = 'Test';

describe('StudioLabelAsParagraph', () => {
  it('renders children correctly', () => {
    renderStudioLabelAsParagraph();
    expect(getText(mockText)).toBeInTheDocument();
  });

  it('applies custom data-size correctly', () => {
    renderStudioLabelAsParagraph({ 'data-size': 'lg' });

    expect(getText(mockText).getAttribute('data-size')).toBe('lg');
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioLabelAsParagraph({ className }));
  });

  it('Appends custom attributes to the label element', () => {
    testCustomAttributes(renderStudioLabelAsParagraph);
  });
});

const renderStudioLabelAsParagraph = (
  props: Partial<StudioLabelAsParagraphProps> = {},
): RenderResult => {
  return render(<StudioLabelAsParagraph {...props}>{mockText}</StudioLabelAsParagraph>);
};

const getText = (text: string): HTMLElement => screen.getByText(text);

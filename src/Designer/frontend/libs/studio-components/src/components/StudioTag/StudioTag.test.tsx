import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioTag, type StudioTagProps } from './StudioTag';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const mockText: string = 'Test tag';

describe('StudioTag', () => {
  it('Renders children correctly', () => {
    renderStudioTag();
    expect(getText(mockText)).toBeInTheDocument();
  });

  it('Applies custom data-size correctly', () => {
    renderStudioTag({ 'data-size': 'lg' });

    expect(getText(mockText).getAttribute('data-size')).toBe('lg');
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioTag({ className }));
  });

  it('Appends custom attributes to the span element', () => {
    testCustomAttributes(renderStudioTag);
  });
});

const renderStudioTag = (props: Partial<StudioTagProps> = {}): RenderResult => {
  return render(<StudioTag {...props}>{mockText}</StudioTag>);
};

const getText = (text: string): HTMLElement => screen.getByText(text);

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioField } from './StudioField';
import type { StudioFieldProps } from './StudioField';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const mockText: string = 'Test Text';

describe('StudioField', () => {
  it('renders children correctly', () => {
    renderField();
    expect(getText(mockText)).toBeInTheDocument();
  });

  it('applies custom data-size correctly', () => {
    renderField({ 'data-size': 'lg' });

    expect(getText(mockText).getAttribute('data-size')).toBe('lg');
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderField({ className }));
  });

  it('Appends custom attributes to the field element', () => {
    testCustomAttributes(renderField);
  });
});

const renderField = (props: Partial<StudioFieldProps> = {}): RenderResult => {
  return render(<StudioField {...props}>{mockText}</StudioField>);
};

const getText = (text: string): HTMLElement => screen.getByText(text);

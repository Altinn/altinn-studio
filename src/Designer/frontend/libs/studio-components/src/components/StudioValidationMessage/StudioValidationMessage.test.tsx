import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioValidationMessage } from './index';
import type { StudioValidationMessageProps } from './StudioValidationMessage';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const mockText: string = 'Test message';

describe('StudioValidationMessage', () => {
  it('renders children correctly', () => {
    renderStudioValidationMessage();
    expect(getText(mockText)).toBeInTheDocument();
  });

  it('applies custom data-size correctly', () => {
    renderStudioValidationMessage({ 'data-size': 'lg' });

    expect(getText(mockText).getAttribute('data-size')).toBe('lg');
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioValidationMessage({ className }));
  });

  it('Appends custom attributes to the validation element', () => {
    testCustomAttributes(renderStudioValidationMessage);
  });
});

const renderStudioValidationMessage = (
  props: Partial<StudioValidationMessageProps> = {},
): RenderResult => {
  return render(<StudioValidationMessage {...props}>{mockText}</StudioValidationMessage>);
};

const getText = (text: string): HTMLElement => screen.getByText(text);

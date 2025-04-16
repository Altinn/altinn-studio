import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioHelpText, type StudioHelpTextProps } from './StudioHelpText';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const mockTitle: string = 'Test title';
const mockText: string = 'Test text';

const defaultProps: StudioHelpTextProps = {
  'aria-label': mockTitle,
};

describe('StudioHelpText', () => {
  it('renders children correctly', () => {
    renderStudioHelpText();
    expect(getText(mockText)).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioHelpText({ className }));
  });

  it('Appends custom attributes to the help text element', () => {
    testCustomAttributes(renderStudioHelpText);
  });
});

const renderStudioHelpText = (props: Partial<StudioHelpTextProps> = {}): RenderResult => {
  return render(
    <StudioHelpText {...defaultProps} {...props}>
      {mockText}
    </StudioHelpText>,
  );
};

const getText = (text: string): HTMLElement => screen.getByText(text) as HTMLElement;

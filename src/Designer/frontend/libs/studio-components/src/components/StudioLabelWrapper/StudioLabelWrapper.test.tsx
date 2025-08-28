import React from 'react';
import type { ReactNode } from 'react';
import type { RenderResult } from '@testing-library/react';
import { screen, render } from '@testing-library/react';
import { StudioLabelWrapper } from './StudioLabelWrapper';
import type { StudioLabelWrapperProps } from './StudioLabelWrapper';

describe('StudioLabelWrapper', () => {
  it('should render children correctly', () => {
    renderStudioLabelWrapper();
    expect(screen.getByText(childrenText)).toBeInTheDocument();
  });

  it('should not render StudioTag if tagText is not provided', () => {
    renderStudioLabelWrapper();
    expect(screen.queryByText(tagText)).not.toBeInTheDocument();
  });

  it('should render StudioTag with correct text and data-color=warning when required is true', () => {
    renderStudioLabelWrapper({
      tagText,
      required: true,
    });

    const tag = screen.getByText(tagText);
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveAttribute('data-color', 'warning');
  });

  it('should render StudioTag with data-color=info when required is false', () => {
    renderStudioLabelWrapper({
      tagText,
      required: false,
    });

    const tag = screen.getByText(tagText);
    expect(tag).toHaveAttribute('data-color', 'info');
  });
});

const tagText: string = 'Required';
const childrenText: string = 'Test content';
const children: ReactNode = <span>{childrenText}</span>;
const defaultProps: StudioLabelWrapperProps = {
  children,
};

function renderStudioLabelWrapper(props: Partial<StudioLabelWrapperProps> = {}): RenderResult {
  return render(<StudioLabelWrapper {...defaultProps} {...props} />);
}

import React from 'react';
import type { ReactNode } from 'react';
import type { RenderResult } from '@testing-library/react';
import { screen, render } from '@testing-library/react';
import { StudioFormGroup, type StudioFormGroupProps } from './StudioFormGroup';

describe('StudioFormGroup', () => {
  it('should render legend correctly', () => {
    renderStudioFormGroup();
    expect(screen.getByText(legendText)).toBeInTheDocument();
  });

  it('should render description if provided', () => {
    renderStudioFormGroup({ description });
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('should not render description if not provided', () => {
    renderStudioFormGroup();
    expect(screen.queryByText(description)).not.toBeInTheDocument();
  });

  it('should render children correctly', () => {
    renderStudioFormGroup();
    expect(screen.getByText(childrenText)).toBeInTheDocument();
  });

  it('should not render StudioTag if tagText is not provided', () => {
    renderStudioFormGroup();
    expect(screen.queryByText(tagText)).not.toBeInTheDocument();
  });

  it('should render StudioTag with correct text and data-color=warning when required is true', () => {
    renderStudioFormGroup({ tagText, required: true });
    const tag = screen.getByText(tagText);
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveAttribute('data-color', 'warning');
  });

  it('should render StudioTag with data-color=info when required is false', () => {
    renderStudioFormGroup({ tagText, required: false });
    const tag = screen.getByText(tagText);
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveAttribute('data-color', 'info');
  });
});

const legendText: string = 'Legend text';
const description: string = 'Description text';
const tagText: string = 'Required';
const childrenText: string = 'Group content';
const children: ReactNode = <span>{childrenText}</span>;

const defaultProps: StudioFormGroupProps = {
  legend: legendText,
  children,
};

function renderStudioFormGroup(props: Partial<StudioFormGroupProps> = {}): RenderResult {
  return render(<StudioFormGroup {...defaultProps} {...props} />);
}

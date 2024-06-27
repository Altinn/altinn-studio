import React from 'react';
import type { StudioResizableLayoutContainerProps } from './StudioResizableLayoutContainer';
import { StudioResizableLayoutContainer } from './StudioResizableLayoutContainer';
import { render, screen } from '@testing-library/react';
import { StudioResizableLayoutElement } from '../StudioResizableLayoutElement/StudioResizableLayoutElement';

describe('StudioResizableLayoutContainer', () => {
  it('should render children', () => {
    renderStudioResizableLayoutContainer();
    expect(screen.getByTestId('childone')).toBeInTheDocument();
    expect(screen.getByTestId('childtwo')).toBeInTheDocument();
  });

  it('should render just one handle with two children', () => {
    renderStudioResizableLayoutContainer();
    expect(screen.getAllByRole('separator').length).toBe(1);
  });
});

const renderStudioResizableLayoutContainer = (
  props: Partial<StudioResizableLayoutContainerProps> = {},
) => {
  const defaultProps: StudioResizableLayoutContainerProps = {
    layoutId: 'test',
    orientation: 'horizontal',
    children: [],
  };
  return render(
    <StudioResizableLayoutContainer {...defaultProps} {...props}>
      <StudioResizableLayoutElement minimumSize={262}>
        <div data-testid='childone' style={{ width: 400 }}>
          test1
        </div>
      </StudioResizableLayoutElement>
      <StudioResizableLayoutElement minimumSize={262}>
        <div data-testid='childtwo' style={{ width: 400 }}>
          test1
        </div>
      </StudioResizableLayoutElement>
    </StudioResizableLayoutContainer>,
  );
};
